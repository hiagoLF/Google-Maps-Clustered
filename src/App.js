import { useEffect, useRef, useState } from "react";
import useSwr from "swr";
import GoogleMapReact from "google-map-react";
import useSupercluster from "use-supercluster";

import "./App.css";

import crimeIcon from "./custody.png";

const fetcher = (...args) => fetch(...args).then((response) => response.json());

const Marker = ({ children }) => children;

function App() {
   // setup map
   const mapRef = useRef();

   // load and prepare data
   const url =
      "https://data.police.uk/api/crimes-street/all-crime?lat=52.629729&lng=-1.131592&date=2019-10";
   const { data, error } = useSwr(url, { fetcher });
   const crimes = data && !error ? data : [];
   const points = crimes.map((crime) => ({
      type: "Feature",
      properties: {
         cluster: false,
         crimeId: crime.id,
         category: crime.category,
      },
      geometry: {
         type: "Point",
         coordinates: [
            parseFloat(crime.location.longitude),
            parseFloat(crime.location.latitude),
         ],
      },
   }));

   // get map bounds
   const [bounds, setBounds] = useState(null);
   const [zoom, setZoom] = useState(10);
   const [pointsInsideBounds, setPointsInsideBounds] = useState([]);

   // get clusters
   const { clusters, supercluster } = useSupercluster({
      points,
      bounds,
      zoom,
      options: { radius: 75, maxZoom: 20 },
   });

   useEffect(() => {
      const pointsInsideBounds = points.filter((point) => {
         const [longitude, latitude] = point.geometry.coordinates;
         const [nwlng, selat, selng, nwlat] = bounds;
         if (
            nwlng < longitude &&
            selat < latitude &&
            selng > longitude &&
            nwlat > latitude
         ) {
            return true;
         } else {
            return false;
         }
      });
      setPointsInsideBounds(pointsInsideBounds.slice(0, 100));
   }, [bounds]);

   // return map
   return (
      <div style={{ height: "100vh", width: "100%", display: "flex" }}>
         <div style={{ height: "100%", width: "70%" }}>
            <GoogleMapReact
               bootstrapURLKeys={{ key: process.env.REACT_APP_GOOGLE_KEY }}
               defaultCenter={{ lat: 52.6376, lng: -1.135171 }}
               defaultZoom={10}
               yesIWantToUseGoogleMapApiInternals
               onGoogleApiLoaded={({ map }) => {
                  mapRef.current = map;
               }}
               onChange={({ zoom, bounds }) => {
                  setZoom(zoom);
                  setBounds([
                     bounds.nw.lng,
                     bounds.se.lat,
                     bounds.se.lng,
                     bounds.nw.lat,
                  ]);
               }}
            >
               {clusters.map((cluster) => {
                  const [longitude, latitude] = cluster.geometry.coordinates;
                  const { cluster: isCluster, point_count: pointCount } =
                     cluster.properties;

                  if (isCluster) {
                     return (
                        <Marker
                           key={`cluster-${cluster.id}`}
                           lat={latitude}
                           lng={longitude}
                        >
                           <div
                              className="cluster-marker"
                              style={{
                                 width: `${
                                    10 + (pointCount / points.length) * 20
                                 }px`,
                                 height: `${
                                    10 + (pointCount / points.length) * 20
                                 }px`,
                              }}
                              onClick={() => {
                                 const expansionZoom = Math.min(
                                    supercluster.getClusterExpansionZoom(
                                       cluster.id
                                    ),
                                    20
                                 );
                                 mapRef.current.setZoom(expansionZoom);
                                 mapRef.current.panTo({
                                    lat: latitude,
                                    lng: longitude,
                                 });
                              }}
                           >
                              {pointCount}
                           </div>
                        </Marker>
                     );
                  }

                  return (
                     <Marker
                        key={`crime-${cluster.properties.crimeId}`}
                        lat={latitude}
                        lng={longitude}
                     >
                        <button className="crime-marker">
                           <img src={crimeIcon} alt="crime doesn't pay" />
                        </button>
                     </Marker>
                  );
               })}
            </GoogleMapReact>
         </div>
         <ul style={{ width: "10%", overflow: "auto" }} className="results">
            {pointsInsideBounds.map((point) => (
               <li>{JSON.stringify(point.properties.crimeId)}</li>
            ))}
         </ul>
      </div>
   );
}

export default App;
