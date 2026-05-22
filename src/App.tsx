import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationBanner } from "@/components/NotificationBanner";
import { CookieConsent } from "@/components/CookieConsent";
import Index from "./pages/Index";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import ShareView from "./pages/ShareView";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AISupportLauncher from "./components/AISupportLauncher";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminStatusChecker from "./pages/AdminStatusChecker";
import DownloadPayment from "./pages/DownloadPayment";
import DownloadEmailSubmit from "./pages/DownloadEmailSubmit";
import DownloadConfirmation from "./pages/DownloadConfirmation";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import StatusManagement from "./pages/StatusManagement";
import SellerDashboard from "./pages/SellerDashboard";
import SellerProfileView from "./pages/SellerProfileView";
import Subscriptions from "./pages/Subscriptions";
import Affiliate from "./pages/Affiliate";
import Ambassador from "./pages/Ambassador";
import Explore from "./pages/Explore";
import Messages from "./pages/Messages";
import Track from "./pages/Track";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
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
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<UserProfile />} />
                <Route path="/user/:userId" element={<UserProfile />} />
                <Route path="/status-management" element={<StatusManagement />} />
                <Route path="/seller" element={<SellerDashboard />} />
                <Route path="/seller-profile/:sellerId" element={<SellerProfileView />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/affiliate" element={<Affiliate />} />
                <Route path="/ambassador" element={<Ambassador />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/share/:itemId" element={<ShareView />} />
                <Route path="/download/:itemId/payment" element={<DownloadPayment />} />
                <Route path="/download-payment/:itemId" element={<DownloadPayment />} />
                <Route path="/download/:itemId/email" element={<DownloadEmailSubmit />} />
                <Route path="/download/:itemId/confirmation" element={<DownloadConfirmation />} />
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/check" element={<AdminStatusChecker />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/track" element={<Track />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <AISupportLauncher />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
