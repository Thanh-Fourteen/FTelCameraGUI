import type { RouteObject } from "react-router-dom";
import { MainLayout } from "./layout/MainLayout";
import { HomePage } from "./pages/Home/HomePage";
import CardManager from "./pages/CardManager/CardManager";
import CameraViewPage from "./pages/CameraViewPage/CameraViewPage";
import FaceRegistration from "./pages/FaceRegistration/FaceRegistration";
import ImageAnalysisPage from "./pages/ImageAnalysis/ImageAnalysis";
import AuthPage from "./pages/Auth/AuthPage";
import ModelComparisonPage from "./pages/ModelComparison/ModelComparisonPage";

function NotFoundPage() {
    return <h1 style={{ padding: 20 }}>404 - Page Not Found</h1>
}

export const routesConfig: RouteObject[] = [
    {
        path: '/auth',
        element: <AuthPage /> // Trang này nằm ngoài MainLayout thường là tốt nhất
    },
    {
        path: '/',
        element: <MainLayout />, // Layout chung
        children: [
            // 1. TRANG CHỦ (path: /)
            {
                index: true,
                element: <HomePage />,
            },

            // 2. DANH SÁCH CAMERA (path: /camera)
            {
                path: 'camera',
                element: <CardManager />,
            },

            // 3. CHI TIẾT CAMERA (path: /camera/cam_01)
            {
                path: 'camera/:instanceId/:camId',
                element: <CameraViewPage />,
            },
            {
                path: 'face-register',
                element: <FaceRegistration />
            },
            {
                path: 'image-analysis',
                element: <ImageAnalysisPage />
            },
            {
                path: 'model-comparison',
                element: <ModelComparisonPage />
            },
            {
                path: '*',
                element: <NotFoundPage />
            }
        ]
    },

    {
        path: '*',
        element: <NotFoundPage />
    }
]