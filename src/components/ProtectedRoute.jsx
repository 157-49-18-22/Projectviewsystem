// ProtectedRoute.jsx
// Agar token nahi hai localStorage mein to login pe redirect karo
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
        // Not logged in → redirect to login
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
