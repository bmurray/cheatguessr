# Cheatguessr - Easy cheating at Chatguessr

This can be run by downloading the appropriate release found in the release bar to the right. 

# Releases

To run the released version, simply double click the binary, and visit [http://localhost:8080](http://localhost:8080).

You can also run it from the command line. Useful arguments:

### `./cheatguessr -listen :8080`

Change the port to listen on

### `./cheatguessr -dev`

Runs the server in Development mode; requires npm run to be running

### `./cheatguessr -dev -proxy http://localhost:3000`

Useful for changing the port that the React development site is running on


# Development mode

You may also build this if you have React installed. 

### `cd reactsite`
### `npm run`

This starts the server in react development mode\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

Alternatively, if you have React and Go installed:

### `make build`

Then run the binary 