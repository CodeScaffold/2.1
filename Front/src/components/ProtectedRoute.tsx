import { useAuth } from "../hooks/auth";
import { Navigate, Outlet } from "react-router";
import MainDrawer from "./common/Drawer.tsx";

const ProtectedRoute = () => {
  const { isAuth } = useAuth();
  if (!isAuth) {
    return <Navigate to="/login" />;
  }
  return (
    <MainDrawer>
      <Outlet />
    </MainDrawer>
  );
};
export default ProtectedRoute;
