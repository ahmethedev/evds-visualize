import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Landing from "./routes/landing";
import MapRoute from "./routes/map";
import { DEFAULT_DATAGROUP } from "./lib/datagroups";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/map" element={<Navigate to={`/map/${DEFAULT_DATAGROUP}`} replace />} />
        <Route path="/map/:datagroup" element={<MapRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
