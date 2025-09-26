import { Outlet, Navigate } from "react-router-dom";

const AuthLayout = () => {
  const isAuthenticated = false;
  return (
    <>
      {isAuthenticated ? (
        <Navigate to="/" />
      ) : (
        <div className="flex overflow-hidden w-full">
          
            <Outlet />
          

          
        </div>
      )}
    </>
  );
};

export default AuthLayout;
