build: bin/cheatguessr.amd64 bin/cheatguessr.arm64 bin/cheatguessr.darwin.arm64 bin/cheatguessr.darwin.amd64 bin/cheatguessr.exe

clean:
	rm bin/cheatguessr*

bin/cheatguessr.amd64: cmd/cheatguessr/main.go reactsite/build/
	GOOS=linux GOARCH=amd64 go build -o $@ cmd/cheatguessr/main.go

bin/cheatguessr.arm64: cmd/cheatguessr/main.go reactsite/build/
	GOOS=linux GOARCH=arm64 go build -o $@ cmd/cheatguessr/main.go

bin/cheatguessr.darwin.amd64: cmd/cheatguessr/main.go reactsite/build/
	GOOS=darwin GOARCH=amd64 go build -o $@ cmd/cheatguessr/main.go

bin/cheatguessr.darwin.arm64: cmd/cheatguessr/main.go reactsite/build/
	GOOS=darwin GOARCH=arm64 go build -o $@ cmd/cheatguessr/main.go

bin/cheatguessr.exe: cmd/cheatguessr/main.go reactsite/build/
	GOOS=windows GOARCH=amd64 go build -o $@ cmd/cheatguessr/main.go
