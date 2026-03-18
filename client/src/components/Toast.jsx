import { useState, useEffect, useCallback } from 'react';
import { FiX, FiAlertCircle, FiCheckCircle, FiInfo, FiRefreshCw } from 'react-icons/fi';
import './Toast.css';

function ToastItem({ toast, onDismiss, onRetry }) {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(() => onDismiss(toast.id), 400);
        }, toast.duration || 5000);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onDismiss]);

    const handleDismiss = () => {
        setExiting(true);
        setTimeout(() => onDismiss(toast.id), 400);
    };

    const iconMap = {
        error: <FiAlertCircle />,
        success: <FiCheckCircle />,
        info: <FiInfo />,
    };

    return (
        <div className={`toast-item toast-${toast.type || 'info'} ${exiting ? 'toast-exit' : ''}`} id={`toast-${toast.id}`}>
            <div className="toast-icon">{iconMap[toast.type] || iconMap.info}</div>
            <div className="toast-content">
                <span className="toast-message">{toast.message}</span>
                {toast.retry && (
                    <button className="toast-retry-btn" onClick={() => onRetry?.(toast)} id={`toast-retry-${toast.id}`}>
                        <FiRefreshCw /> Retry
                    </button>
                )}
            </div>
            <button className="toast-close" onClick={handleDismiss}>
                <FiX />
            </button>
        </div>
    );
}

export default function ToastContainer({ toasts = [], onDismiss, onRetry }) {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-container" id="toast-container">
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onDismiss={onDismiss}
                    onRetry={onRetry}
                />
            ))}
        </div>
    );
}
