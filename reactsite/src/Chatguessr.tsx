import React, { useState, useEffect, useCallback, ChangeEventHandler } from 'react'
import ReconnectingWebSocket from 'reconnecting-websocket'
import { MapContainer, TileLayer, Marker, Popup, LayersControl, Circle, useMapEvent, useMapEvents, Polygon } from 'react-leaflet'
import L, { LatLngBoundsExpression, LatLngTuple, LeafletMouseEvent, LatLng, LatLngExpression, PathOptions } from 'leaflet'



function DegToRad(deg: number): number {

    return deg * (Math.PI / 180)
}
function RadToDeg(rad: number): number {
    return rad * (180 / Math.PI)
}
function GetLatLng(start: LatLng, bearing: number, distance: number): LatLng {
    // let R = 6378.1 // KM
    let R = 6371.008 // KM
    let lat1 = DegToRad(start.lat)
    let lon1 = DegToRad(start.lng)
    let lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) +
        Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearing))
    let lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(distance / R) * Math.cos(lat1), Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2))
    // if (lat2 < -Math.PI / 2) {
    //     lat2 += Math.PI / 2
    // }
    return L.latLng(RadToDeg(lat2), RadToDeg(lon2))
}

function PolylineFromStart(start: LatLng, distance: number): LatLng[] {

    if (distance > 10007) {
        return PolylineFromStartConnected(start, distance)
    }
    let points: LatLng[] = []
    for (let i = 0; i < 360.0; i += 0.5) {
        points.push(GetLatLng(start, DegToRad(i), distance))
    }
    return points
}
function PolylineFromStartConnected(start: LatLng, distance: number): LatLng[] {
    // console.log("Split")
    // Default shift right
    let a = 0
    let b = 360.0
    if (start.lng > 0) {
        // Shift left
        a = -360.0
        b = 0
    }
    let points: LatLng[] = []
    for (let i = 0; i <= 180.0; i += 0.5) {
        let p = GetLatLng(start, DegToRad(i), distance)
        let x = L.latLng(p.lat, p.lng + a)
        points.push(x)
        // points.push(GetLatLng(start, DegToRad(i), distance))
    }
    for (let i = 180.5; i < 360.0; i += 0.5) {
        let p = GetLatLng(start, DegToRad(i), distance)
        let x = L.latLng(p.lat, p.lng + b)
        points.push(x)

    }
    return points
}

interface ClickLocationProps {
    clicked: (evt: LatLng) => void
}
function ClickLocation(props: ClickLocationProps) {
    const map = useMapEvent('click', (evt: LeafletMouseEvent) => {
        props.clicked(evt.latlng)
    })
    return null
}
interface BetterCircleProps {
    center: LatLng
    radius: number
    pathOptions?: PathOptions
}
function BetterCircle(props: BetterCircleProps) {
    let [polys, setPolys] = useState<LatLng[]>([])
    useEffect(() => {
        setPolys(PolylineFromStart(props.center, props.radius / 1000.0))
    }, [props])
    return (<Polygon positions={polys} pathOptions={props.pathOptions} />)
}
function ClampLatLng(ll: LatLng): LatLng {
    let lat = ll.lat
    let lng = ll.lng
    for (; lng > 180; lng -= 360) { }
    for (; lng < -180; lng += 360) { }

    return L.latLng(lat, lng)
}
interface ChatguessrProps {
    //channel: string
}
// interface LatLng {
//     lat: number
//     lng: number
// }

interface Guess {
    Location: LatLng
    Distance: number
}

function Chatguessr(props: ChatguessrProps) {
    let [guesses, setGuesses] = useState<Guess[]>([{ Location: L.latLng(0, 0), Distance: 0 }])
    let [selectedGuess, setSelectedGuess] = useState<number>(0)
    let [location, setLocation] = useState<LatLng>(L.latLng(0, 0))
    useEffect(() => {
        setLocation(guesses[selectedGuess].Location)
    }, [selectedGuess, guesses])

    let addGuess = useCallback(() => {
        var n = guesses
        var ng = {
            Location: L.latLng(0, 0),
            Distance: n.length * 10
        } as Guess
        n.push(ng)
        setGuesses(n)
        setSelectedGuess(n.length - 1)
    }, [guesses, setGuesses, setSelectedGuess])

    let setDistance = useCallback((distance: number, idx: number) => {
        console.log(distance, idx)
        var n = guesses
        var g = n[idx]
        g.Distance = distance
        n[idx] = g
        setGuesses(n)
        console.log(n)
    }, [guesses, setGuesses, location, setLocation])


    // let [distance, setDistance] = useState<number>(0)
    // let [guessedDistance, setGuessedDistance] = useState<number>(0)
    // let [confirmedDistance, setConfirmedDistance] = useState<number>(0)
    // let [guessLoc, setGuessLoc] = useState<LatLng>(L.latLng(0, 0))

    let [guess, setGuess] = useState("TestLocation")
    let clicked = useCallback((c: LatLng) => {
        console.log(c)
        var n = guesses
        var g = n[selectedGuess]
        g.Location = c
        n[selectedGuess] = g
        setGuesses(n)
        setLocation(c)
        console.log(n)
        // let dist = c.distanceTo(location) / 1000.0
        // setGuessedDistance(dist)
        // setGuessLoc(c)
        // let lat = c.lat
        // if (lat > 180.0) {
        //     lat -= 180.0
        // }
        // let lng = c.lng
        // if (lng > 180.0) {
        //     lng -= 360.0
        // }

        // let ll = ClampLatLng(c)
        // console.log(ll.lat, ll.lng)
        // setGuess("/w " + props.channel + " !g " + ll.lat + ", " + ll.lng)
    }, [guesses, setGuesses, selectedGuess])

    // let changeConfirmed = useCallback<ChangeEventHandler<HTMLInputElement>>((evt: React.ChangeEvent<HTMLInputElement>) => {
    //     let x = parseFloat(evt.target.value)
    //     let n = x * 1000.0
    //     if (isNaN(n)) {
    //         return
    //     }
    //     setConfirmedDistance(n)
    // }, [setConfirmedDistance])
    let copy = useCallback(() => {
        copyToClipboard(guess)
    }, [guess])
    return (
        <div className="Map-page" >
            {/* <div >Distance: <input id="distance" type="text" onChange={changeDistance} /> Dist: <input type="text" value={guessedDistance} readOnly={true} />Guess: <input type="text" value={guess} readOnly={true} /> Confirmed: <input type="text" onChange={changeConfirmed} defaultValue="" /><button onClick={copy}>Copy</button></div> */}
            <div className='guesses'>
                <Guesses guesses={guesses} addGuess={addGuess} setSelected={setSelectedGuess} setDistance={setDistance} />
            </div>
            <MapContainer className="Map-page-map" center={[0, 0]} zoom={2} scrollWheelZoom={true}>
                <ClickLocation clicked={clicked} />
                <LayersControl position="topleft">
                    <LayersControl.BaseLayer name="OpenStreetMap">
                        <TileLayer
                            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer checked name="Google Rodmap">
                        <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={["mt0", "mt1", "mt2", "mt3"]} ></TileLayer>
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Google Hybrid">
                        <TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={["mt0", "mt1", "mt2", "mt3"]} ></TileLayer>
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Google terrain">
                        <TileLayer url="https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}" subdomains={["mt0", "mt1", "mt2", "mt3"]} ></TileLayer>
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Open Topo Map">
                        <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" ></TileLayer>
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="esriTopographic">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" ></TileLayer>
                    </LayersControl.BaseLayer>
                </LayersControl>
                <Marker position={location}>
                    <Popup>
                        A pretty CSS3 popup. <br /> Easily customizable.
                    </Popup>
                </Marker>
                <GuessMarkers guesses={guesses} />
                {/* <BetterCircle center={location} radius={distance} pathOptions={{ color: 'blue' }} />
                <BetterCircle center={guessLoc} radius={confirmedDistance} pathOptions={{ color: 'red' }} /> */}

            </MapContainer></div >)
}
interface GuessMarkersProps {
    guesses: Guess[]
}
function GuessMarkers(props: GuessMarkersProps) {
    return (
        <>
            {props.guesses.map((g: Guess, i: number) => <BetterCircle key={i} center={g.Location} radius={g.Distance} pathOptions={{ color: colors[i % colors.length] }} />)}
        </>
    )
}
interface GuessesProps {
    guesses: Guess[]
    addGuess: () => void
    setSelected: (n: number) => void
    setDistance: (d: number, idx: number) => void
}
function Guesses(props: GuessesProps) {
    let [channel, changeChannel] = useState<string>("")
    var copy = useCallback((ll: LatLng) => {
        copyGuess(channel, ll)
    }, [channel])

    let changeChannelEvt = useCallback<ChangeEventHandler<HTMLInputElement>>((evt: React.ChangeEvent<HTMLInputElement>) => {
        changeChannel(evt.target.value)
    }, [props])
    return (
        <>
            <input value={channel} onChange={changeChannelEvt} />
            {props.guesses.map((g: Guess, idx: number) => (<GuessPage key={idx} guess={g} Idx={idx} setSelected={props.setSelected} setDistance={props.setDistance} copy={copy} />))}
            <button onClick={props.addGuess}>Add</button>
        </>
    )
}

var colors: string[] = ['red', 'green', 'blue', 'yellow', 'magenta']

interface GuessPageProps {
    guess: Guess
    Idx: number
    setSelected: (n: number) => void
    setDistance: (d: number, idx: number) => void
    copy: (ll: LatLng) => void

}
function GuessPage(props: GuessPageProps) {
    let changeDistance = useCallback<ChangeEventHandler<HTMLInputElement>>((evt: React.ChangeEvent<HTMLInputElement>) => {
        // console.log(evt.target.value)
        let x = parseFloat(evt.target.value)
        let n = x * 1000.0
        if (isNaN(n)) {
            return
        }
        props.setDistance(n, props.Idx)
    }, [props])

    var style = { color: colors[props.Idx % colors.length] }
    return (
        <div className='guessPage' style={style} onClick={() => props.setSelected(props.Idx)}>
            {props.Idx} <input id="distance" type="text" onChange={changeDistance} /><button onClick={() => props.copy(props.guess.Location)}>Copy</button>
        </div>
    )
}
function copyGuess(chan: string, c: LatLng) {
    let ll = ClampLatLng(c)
    // console.log(ll.lat, ll.lng)
    var str = "/w " + chan + " !g " + ll.lat + ", " + ll.lng
    copyToClipboard(str)
}

// https://stackoverflow.com/questions/51805395/navigator-clipboard-is-undefined
function copyToClipboard(textToCopy: string) {
    // navigator clipboard api needs a secure context (https)
    if (navigator.clipboard && window.isSecureContext) {
        // navigator clipboard api method'
        return navigator.clipboard.writeText(textToCopy);
    } else {
        // text area method
        let textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        // make the textarea out of viewport
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise((res: (value: unknown) => void, rej: () => void) => {
            // here the magic happens
            document.execCommand('copy') ? res(null) : rej();
            textArea.remove();
        });
    }
}


export default Chatguessr;