package main

import (
	"flag"
	"io/fs"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/bmurray/cheatguessr/reactsite"
)

func main() {
	_ = reactsite.Files
	proxy := flag.String("proxy", "http://localhost:3000/", "Address to proxy requests to")
	dev := flag.Bool("dev", false, "Enabled development proxy mode; dont use this when running standalone")
	listen := flag.String("listen", ":8080", "Listen on Address and Port")
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
	s := &http.Server{
		Addr:         *listen,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	log.Println(s.ListenAndServe())

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
