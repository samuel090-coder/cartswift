
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { NotificationBanner } from "@/components/NotificationBanner";
import { CookieConsent } from "@/components/CookieConsent";
import Index from "./pages/Index";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import ShareView from "./pages/ShareView";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminStatusChecker from "./pages/AdminStatusChecker";
import DownloadPayment from "./pages/DownloadPayment";
import DownloadEmailSubmit from "./pages/DownloadEmailSubmit";
import DownloadConfirmation from "./pages/DownloadConfirmation";
import Orders from "./pages/Orders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <Toaster />
        <Sonner />
        <NotificationBanner />
        <CookieConsent />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/share/:itemId" element={<ShareView />} />
            <Route path="/download/:itemId/payment" element={<DownloadPayment />} />
            <Route path="/download-payment/:itemId" element={<DownloadPayment />} />
            <Route path="/download/:itemId/email" element={<DownloadEmailSubmit />} />
            <Route path="/download/:itemId/confirmation" element={<DownloadConfirmation />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/check" element={<AdminStatusChecker />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
