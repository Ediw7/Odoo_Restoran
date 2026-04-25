/**
 * useToast — hook for toast notifications & confirm dialogs
 * Usage:
 *   const { toast, confirm, ToastContainer, ConfirmDialog } = useToast();
 *   toast.success("Berhasil!") / toast.error("Gagal!") / toast.info("Info")
 *   const ok = await confirm({ title, message, confirmText?, danger? })
 */
import React, { useState, useCallback, useRef } from "react";

export function useToast() {
    const [toasts, setToasts] = useState([]);
    const [dialog, setDialog] = useState(null);
    const resolveRef = useRef(null);

    const addToast = useCallback((type, text) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, text }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const toast = {
        success: (text) => addToast("success", text),
        error: (text) => addToast("error", text),
        info: (text) => addToast("info", text),
        warning: (text) => addToast("warning", text),
    };

    const confirm = useCallback(({ title, message, confirmText = "Ya, Lanjutkan", danger = false }) => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setDialog({ title, message, confirmText, danger });
        });
    }, []);

    const handleConfirm = (result) => {
        setDialog(null);
        resolveRef.current?.(result);
    };

    const icons = {
        success: (
            <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        info: (
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        warning: (
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
        ),
    };

    const styles = {
        success: "bg-white border-l-4 border-green-500",
        error: "bg-white border-l-4 border-red-500",
        info: "bg-white border-l-4 border-blue-500",
        warning: "bg-white border-l-4 border-amber-500",
    };

    const ToastContainer = () => (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg ${styles[t.type]} pointer-events-auto max-w-xs animate-slide-up`}
                    style={{ animation: "slideUp 0.25s ease-out" }}>
                    {icons[t.type]}
                    <p className="text-sm font-semibold text-gray-700 leading-snug">{t.text}</p>
                </div>
            ))}
        </div>
    );

    const ConfirmDialog = () => {
        if (!dialog) return null;
        return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 pt-6 pb-4">
                        <h3 className="text-base font-bold text-gray-800 mb-1.5">{dialog.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{dialog.message}</p>
                    </div>
                    <div className="flex gap-2 px-6 pb-5 pt-1">
                        <button onClick={() => handleConfirm(false)}
                            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-all">
                            Batal
                        </button>
                        <button onClick={() => handleConfirm(true)}
                            className={`flex-1 py-2.5 font-bold rounded-xl text-sm transition-all text-white ${dialog.danger ? "bg-red-500 hover:bg-red-600" : "bg-orange-500 hover:bg-orange-600"}`}>
                            {dialog.confirmText}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return { toast, confirm, ToastContainer, ConfirmDialog };
}
