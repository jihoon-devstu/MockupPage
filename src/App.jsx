import { Routes, Route, Navigate } from 'react-router-dom';
import ShopLayout from './layouts/ShopLayout';
import Home from './pages/shop/Home';
import ProductList from './pages/shop/ProductList';
import ProductDetail from './pages/shop/ProductDetail';
import { StoreHome, StoreList } from './pages/shop/StorePages';
import { Cart, Checkout, OrderComplete } from './pages/shop/CartCheckout';
import { Login, Signup, Help } from './pages/shop/AuthPages';
import SellerApply from './pages/shop/SellerApply';
import {
  MyPageLayout, MyOrders, MyOrderDetail, ClaimRequest, MyClaims, MyReviews, MyWishlist, MyQna, MyCoupons, MyProfile, MyAddresses,
} from './pages/mypage/MyPage';
import SellerLayout from './pages/seller/SellerLayout';
import SellerDashboard from './pages/seller/SellerDashboard';
import { SellerProductList, SellerProductForm } from './pages/seller/SellerProducts';
import { SellerOrderList, SellerOrderDetail, SellerClaims } from './pages/seller/SellerOrders';
import { SellerReviews, SellerQna, SellerSettlements, SellerStore } from './pages/seller/SellerMisc';
import { AdminLayout, AdminDashboard, AdminApplications, AdminApplicationDetail } from './pages/admin/AdminCore';
import { AdminStores, AdminStoreDetail, AdminSettlements, AdminUsers, AdminUserDetail, AdminReviews, AdminCategories } from './pages/admin/AdminMore';
import { ToastHost } from './components/ui';
import MockNav from './components/MockNav';

export default function App() {
  return (
    <>
      <Routes>
        {/* ── 구매자 쇼핑몰 ── */}
        <Route element={<ShopLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="stores" element={<StoreList />} />
          <Route path="store/:id" element={<StoreHome />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order/complete" element={<OrderComplete />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="help" element={<Help />} />
          <Route path="seller/apply" element={<SellerApply />} />
          <Route path="mypage" element={<MyPageLayout />}>
            <Route index element={<Navigate to="orders" replace />} />
            <Route path="orders" element={<MyOrders />} />
            <Route path="orders/:id" element={<MyOrderDetail />} />
            <Route path="claim/:lineId" element={<ClaimRequest />} />
            <Route path="claims" element={<MyClaims />} />
            <Route path="reviews" element={<MyReviews />} />
            <Route path="wishlist" element={<MyWishlist />} />
            <Route path="qna" element={<MyQna />} />
            <Route path="coupons" element={<MyCoupons />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="addresses" element={<MyAddresses />} />
          </Route>
        </Route>

        {/* ── 판매자센터 ── */}
        <Route path="seller" element={<SellerLayout />}>
          <Route index element={<SellerDashboard />} />
          <Route path="products" element={<SellerProductList />} />
          <Route path="products/new" element={<SellerProductForm />} />
          <Route path="products/:id/edit" element={<SellerProductForm key="edit" />} />
          <Route path="orders" element={<SellerOrderList />} />
          <Route path="orders/:lineId" element={<SellerOrderDetail />} />
          <Route path="claims" element={<SellerClaims />} />
          <Route path="reviews" element={<SellerReviews />} />
          <Route path="qna" element={<SellerQna />} />
          <Route path="settlements" element={<SellerSettlements />} />
          <Route path="store" element={<SellerStore />} />
        </Route>

        {/* ── 스토어 관리자 ── */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="applications/:id" element={<AdminApplicationDetail />} />
          <Route path="stores" element={<AdminStores />} />
          <Route path="stores/:id" element={<AdminStoreDetail />} />
          <Route path="settlements" element={<AdminSettlements />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="categories" element={<AdminCategories />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost />
      <MockNav />
    </>
  );
}
