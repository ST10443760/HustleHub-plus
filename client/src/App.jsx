import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminTransactions from './pages/AdminTransactions';
import AdminUsers from './pages/AdminUsers';
import FreelancerBookings from './pages/FreelancerBookings';
import GigEditor from './pages/GigEditor';
import GigDetail from './pages/GigDetail';
import Gigs from './pages/Gigs';
import Home from './pages/Home';
import Income from './pages/Income';
import Login from './pages/Login';
import MyBookings from './pages/MyBookings';
import MyGigs from './pages/MyGigs';
import MyTransactions from './pages/MyTransactions';
import NotFound from './pages/NotFound';
import Register from './pages/Register';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        {/* Any logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="gigs" element={<Gigs />} />
          <Route path="gigs/:id" element={<GigDetail />} />
        </Route>

        {/* Clients */}
        <Route element={<ProtectedRoute roles={['client']} />}>
          <Route path="bookings" element={<MyBookings />} />
          <Route path="transactions" element={<MyTransactions />} />
        </Route>

        {/* Freelancers */}
        <Route element={<ProtectedRoute roles={['freelancer']} />}>
          <Route path="freelancer/gigs" element={<MyGigs />} />
          <Route path="freelancer/gigs/new" element={<GigEditor />} />
          <Route path="freelancer/gigs/:id/edit" element={<GigEditor />} />
          <Route path="freelancer/bookings" element={<FreelancerBookings />} />
          <Route path="income" element={<Income />} />
        </Route>

        {/* Admins */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/transactions" element={<AdminTransactions />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
