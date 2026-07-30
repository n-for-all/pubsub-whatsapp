import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import z from "zod"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatMemory(used: number, total: number): string {
    return `${used} MB / ${total} MB`;
}

export function formatPercentage(used: number, total: number): string {
    if (total === 0) return "0%";
    const percentage = (used / total) * 100;
    return `${percentage.toFixed(2)}%`;
}

export function formatUptime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // If more than one day, show the date
    if (days > 0) {
        const date = new Date(timestamp);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else {
        return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
    }
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatRelativeTime(dateString: string | Date): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 0) {
        return "in the future";
    }

    if (diffInSeconds < 60) {
        return diffInSeconds === 1 ? "1 second ago" : `${diffInSeconds} seconds ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return diffInMinutes === 1 ? "1 minute ago" : `${diffInMinutes} minutes ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return diffInMonths === 1 ? "1 month ago" : `${diffInMonths} months ago`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return diffInYears === 1 ? "1 year ago" : `${diffInYears} years ago`;
}

export function getInitials(name: string): string {
    if (!name || typeof name !== "string") {
        return "";
    }

    return name
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase())
        .slice(0, 2) // Take only first 2 initials
        .join("");
}

export function getRoleColor(role: string): string {
    if (!role || typeof role !== "string") {
        return "bg-zinc-500";
    }

    const normalizedRole = role.toLowerCase().trim();

    switch (normalizedRole) {
        case "admin":
        case "administrator":
            return "bg-red-500";

        case "owner":
        case "super":
        case "superadmin":
            return "bg-purple-500";

        case "moderator":
        case "mod":
            return "bg-orange-500";

        case "editor":
        case "contributor":
            return "bg-blue-500";

        case "user":
        case "member":
        case "basic":
            return "bg-green-500";

        case "guest":
        case "visitor":
            return "bg-zinc-400";

        case "developer":
        case "dev":
            return "bg-indigo-500";

        case "manager":
            return "bg-yellow-500";

        case "support":
        case "help":
            return "bg-cyan-500";

        case "vip":
        case "premium":
            return "bg-amber-500";

        case "banned":
        case "suspended":
            return "bg-red-700";

        default:
            // Generate a consistent color based on the role string
            let hash = 0;
            for (let i = 0; i < normalizedRole.length; i++) {
                hash = normalizedRole.charCodeAt(i) + ((hash << 5) - hash);
            }

            const colors = [
                "bg-slate-500",
                "bg-zinc-500",
                "bg-neutral-500",
                "bg-stone-500",
                "bg-rose-500",
                "bg-pink-500",
                "bg-fuchsia-500",
                "bg-violet-500",
                "bg-sky-500",
                "bg-teal-500",
                "bg-emerald-500",
                "bg-lime-500",
            ];

            return colors[Math.abs(hash) % colors.length];
    }
}

export async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise((resolve, reject) => {
            document.execCommand("copy") ? resolve() : reject();
            textArea.remove();
        });
    }
}

// Email validation function
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Strong password validation
export function isStrongPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
}
export function isValidPassword(password: string): boolean {
    return password.length >= 6;
}

export function getGravatarUrl(email?: string, size = 128) {
    if (!email) {
        return "";
    }

    return `https://api.dicebear.com/8.x/initials/svg?seed=${email}&scale=70&size=40`;
}

export function formatZodErrorText(error: z.ZodError, withPath = true): string {
    if (!error || !error.issues) return "";
    return error.issues.map((issue: any) => `${issue.message}${withPath && issue.path.length ? ` for "${issue.path.join(".")}"` : ""}`).join("\n");
}
