package main

import (
	"encoding/hex"
	"encoding/json"
	"flag"
	"io/fs"
	"log"
	"math/rand"
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
	var mkrs []llMaker

	if *ws != "" {
		mkr := openSocket(*ws, "bot")
		mkrs = append(mkrs, mkr)
	}

	mux.Handle("/chatguessr", chatguessr(mkrs...))

	s := &http.Server{
		Addr:         *listen,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	log.Println(s.ListenAndServe())

}

type OpCode string

const (
	OpCodeConnect    OpCode = "connect"
	OpCodeDisconnect        = "disconnect"
	OpCodeMessage           = "message"
	OpCodeBot               = "bot"
)

type LatLng struct {
	Lat float32 `json:"lat"`
	Lng float32 `json:"lng"`
}
type Guess struct {
	Location LatLng  `json:"Location"`
	Distance float32 `json:"Distance"`
	Ident    string  `json:"Ident,omitempty"`
	Op       OpCode  `json:"OpCode,omitemtpy"`
}

type llClients map[chan<- Guess]string

type llSender func(Guess)

type llMaker func(llSender)

func chatguessr(makers ...llMaker) http.HandlerFunc {
	clients := make(chan func(llClients) llClients)

	go func() {
		// log.Println("GUESSER")
		cl := make(llClients)
		for {
			select {
			case clF := <-clients:
				cl = clF(cl)
			}
		}

	}()

	add := func(c chan<- Guess, ident string) {
		clients <- func(i llClients) llClients {
			i[c] = ident
			return i
		}
	}
	rem := func(c chan<- Guess) {
		clients <- func(i llClients) llClients {
			delete(i, c)
			return i
		}
	}
	send := func(ll Guess) {
		clients <- func(i llClients) llClients {
			for c, ident := range i {
				if ident == ll.Ident {
					continue
				}
				select {
				case c <- ll:
				default:
				}
			}
			return i
		}
	}
	for _, mkr := range makers {
		go mkr(send)
	}
	// go openSocket(urls, send)

	upgrader := websocket.Upgrader{}
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	return func(w http.ResponseWriter, req *http.Request) {
		c, err := upgrader.Upgrade(w, req, nil)
		if err != nil {
			log.Println("cannot upgrade")
			return
		}
		defer c.Close()
		b := make([]byte, 32)
		if i, err := r.Read(b); err != nil || i != len(b) {
			return
		}
		ident := hex.EncodeToString(b)

		llC := make(chan Guess)

		send(Guess{Ident: ident, Op: OpCodeConnect})
		add(llC, ident)
		defer func(chan Guess) {
			rem(llC)
			send(Guess{Ident: ident, Op: OpCodeDisconnect})
		}(llC)
		// lx := LatLng{
		// 	Lat: 25,
		// 	Lng: -25,
		// }
		// if err := c.WriteJSON(lx); err != nil {
		// 	log.Println("Cannot write json welcome")
		// 	return
		// }
		go func(c *websocket.Conn) {
			for {
				var ll Guess
				if err := c.ReadJSON(&ll); err != nil {
					return
				}
				ll.Ident = ident
				ll.Op = OpCodeMessage
				send(ll)
			}

		}(c)
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
func openSocket(urls, name string) llMaker {

	var f llMaker

	f = func(send llSender) {
		defer func() {
			time.Sleep(5 * time.Second)
			go f(send)
			// go openSocket(urls, send)
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
			g := Guess{
				Location: ll,
				Distance: 0,
				Ident:    name,
				Op:       OpCodeBot,
			}

			send(g)
		}
	}
	return f
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
