package main

import (
	"encoding/json"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/bmurray/cheatguessr/reactsite"
	"github.com/gorilla/websocket"
)

func main() {
	_ = reactsite.Files
	proxy := flag.String("proxy", "http://localhost:3000/", "Address to proxy requests to")
	dev := flag.Bool("dev", false, "Enabled development proxy mode; dont use this when running standalone")
	listen := flag.String("listen", ":8080", "Listen on Address and Port")
	ws := flag.String("ws", "", "Connect to websocket")
	flag.Parse()

	mux := http.NewServeMux()
	if *dev {
		u, err := url.Parse(*proxy)
		if err != nil {
			log.Fatal("cannot parse proxy url", err)
		}
		mux.Handle("/", httputil.NewSingleHostReverseProxy(u))
	} else {
		filesystem := fs.FS(reactsite.Files)
		static, err := fs.Sub(filesystem, "build")
		if err != nil {
			log.Fatal("Cannot open filesystem", err)
		}
		mux.Handle("/", http.FileServer(EmbedDir{http.FS(static)}))
	}
	if *ws != "" {
		mux.Handle("/chatguessr", chatguessr(*ws))
	}

	s := &http.Server{
		Addr:         *listen,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	log.Println(s.ListenAndServe())

}

type LatLng struct {
	Lat float32 `json:"lat"`
	Lng float32 `json:"lng"`
}

type llClients map[chan<- LatLng]bool

func chatguessr(urls string) http.HandlerFunc {
	clients := make(chan func(llClients) llClients)

	go func() {
		cl := make(llClients)
		for {
			select {
			case clF := <-clients:
				cl = clF(cl)
			}
		}

	}()

	add := func(c chan<- LatLng) {
		clients <- func(i llClients) llClients {
			i[c] = true
			return i
		}
	}
	rem := func(c chan<- LatLng) {
		clients <- func(i llClients) llClients {
			delete(i, c)
			return i
		}
	}
	send := func(ll LatLng) {
		clients <- func(i llClients) llClients {
			for c := range i {
				select {
				case c <- ll:
				default:
				}
			}
			return i
		}
	}
	go openSocket(urls, send)

	upgrader := websocket.Upgrader{}
	return func(w http.ResponseWriter, req *http.Request) {
		c, err := upgrader.Upgrade(w, req, nil)
		if err != nil {
			log.Println("cannot upgrade")
			return
		}
		defer c.Close()
		llC := make(chan LatLng)
		add(llC)
		defer rem(llC)
		lx := LatLng{
			Lat: 25,
			Lng: -25,
		}
		if err := c.WriteJSON(lx); err != nil {
			log.Println("Cannot write json welcome")
			return
		}
		for {
			ll, ok := <-llC
			if !ok {
				return
			}
			if err := c.WriteJSON(ll); err != nil {
				return
			}
		}
	}
}
func openSocket(urls string, send func(LatLng)) {
	defer func() {
		go openSocket(urls, send)
	}()
	c, _, err := websocket.DefaultDialer.Dial(urls, nil)
	if err != nil {
		log.Println("Server dialer failed")
		time.Sleep(10 * time.Second)
		return
	}
	for {
		_, message, err := c.ReadMessage()
		if err != nil {
			log.Println("server connection failed", err)
			return
		}
		var ll LatLng
		if err := json.Unmarshal(message, &ll); err != nil {
			log.Println("Cannot marshal lat lng", err)
			return
		}
		send(ll)
	}
}

type EmbedDir struct {
	http.FileSystem
}

func (d EmbedDir) Open(name string) (http.File, error) {
	if f, err := d.FileSystem.Open(name); err == nil {
		return f, nil
	} else {
		return d.FileSystem.Open("/index.html")
	}
}
