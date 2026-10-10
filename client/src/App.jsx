import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ComingSoon from './pages/ComingSoon';
import GigDetail from './pages/GigDetail';
import Gigs from './pages/Gigs';
import Home from './pages/Home';
import Login from './pages/Login';
import MyBookings from './pages/MyBookings';
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

        {/* Freelancers - pages arrive in the next batch */}
        <Route element={<ProtectedRoute roles={['freelancer']} />}>
          <Route path="freelancer/gigs" element={<ComingSoon title="My gigs" />} />
          <Route path="freelancer/bookings" element={<ComingSoon title="Bookings on my gigs" />} />
          <Route path="income" element={<ComingSoon title="Income" />} />
        </Route>

        {/* Admins - pages arrive in the next batch */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="admin/users" element={<ComingSoon title="Users" />} />
          <Route path="admin/transactions" element={<ComingSoon title="All transactions" />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
