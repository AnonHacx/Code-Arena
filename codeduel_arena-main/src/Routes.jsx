import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
// Add your imports here
import RoomCreationJoin from "pages/room-creation-join";
import LiveCodingBattle from "pages/live-coding-battle";
import NotFound from "pages/NotFound";

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        {/* Define your routes here */}
        <Route path="/" element={<RoomCreationJoin />} />
        <Route path="/room-creation-join" element={<RoomCreationJoin />} />
        <Route path="/live-coding-battle" element={<LiveCodingBattle />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;