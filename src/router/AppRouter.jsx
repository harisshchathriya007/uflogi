import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import RoleSelect from '../pages/RoleSelect'
import LoginDashboard from '../pages/LoginDashboard'
import OperatorLogin from '../pages/OperatorLogin'
import OperatorOTP from '../pages/OperatorOTP'
import DriverLogin from '../pages/DriverLogin'
import DriverOTP from '../pages/DriverOTP'
import OperatorDashboard from '../pages/OperatorDashboard'
import DriverDashboard from '../pages/DriverDashboard'
import LoadConsolidation from '../pages/LoadConsolidation'
import Drivers from '../pages/Drivers'
import Orders from '../pages/Orders'
import TodayJob from '../pages/TodayJob'
import LiveNavigation from '../pages/LiveNavigation'
import ProofOfDelivery from '../pages/ProofOfDelivery'
import DriverEarnings from '../pages/DriverEarnings'
import VehicleInfo from '../pages/VehicleInfo'
import CompletedDeliveries from '../pages/CompletedDeliveries'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/role-select" element={<RoleSelect />} />
        <Route path="/login-dashboard" element={<LoginDashboard />} />
        <Route path="/operator-login" element={<OperatorLogin />} />
        <Route path="/operator-otp" element={<OperatorOTP />} />
        <Route path="/operator-dashboard" element={<OperatorDashboard />} />
        <Route path="/ml-consolidation" element={<LoadConsolidation />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/driver-login" element={<DriverLogin />} />
        <Route path="/otp" element={<DriverOTP />} />
        <Route path="/driver-dashboard" element={<DriverDashboard />} />
        <Route path="/todays-job" element={<TodayJob />} />
        <Route path="/navigate" element={<LiveNavigation />} />
        <Route path="/proof-delivery" element={<ProofOfDelivery />} />
        <Route path="/earnings" element={<DriverEarnings />} />
        <Route path="/vehicle-type" element={<VehicleInfo />} />
        <Route path="/completed" element={<CompletedDeliveries />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
