import { BrowserRouter, Route, Routes } from "react-router";
import Landing from "./routes/landing";
import MapRoute from "./routes/map";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/map" element={<MapRoute />} />
        <Route path="/map/:datagroup" element={<MapRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
