import { BrowserRouter, Route, Routes } from "react-router";
import Landing from "./routes/landing";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}
