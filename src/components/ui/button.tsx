import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center tracking-tight justify-center gap-2 whitespace-nowrap rounded-md text-sm whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none text-sm items-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:scale-100 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-blue-500 text-white hover:bg-blue-300 dark:bg-blue-500 dark:hover:bg-blue-300 dark:text-white [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#1e40af,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(59,_130,_246,_58%)] hover:translate-y-[1px] hover:scale-[0.99] hover:[box-shadow:inset_0px_-1px_0px_0px_#1e40af,_0px_1px_3px_0px_rgba(59,_130,_246,_40%)] active:translate-y-[2px] active:scale-[0.99] active:[box-shadow:inset_0px_1px_1px_0px_#1e40af,_0px_1px_2px_0px_rgba(59,_130,_246,_30%)]",
                warning: `bg-yellow-500 text-white hover:bg-yellow-300 dark:bg-yellow-500 dark:hover:bg-yellow-300 dark:text-white shadow-[inset_0_-2px_0_0_#ca8a04,0_1px_6px_0_rgba(202,138,4,0.58)] hover:translate-y-[1px] hover:scale-[0.99] hover:shadow-[inset_0_-1px_0_0_#ca8a04,0_1px_3px_0_rgba(202,138,4,0.4)] active:translate-y-[2px] active:scale-[0.99] active:shadow-[inset_0_1px_1px_0_#ca8a04,0_1px_2px_0_rgba(202,138,4,0.3)]`,
                destructive: `bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[inset_0_-2px_0_0_#dc2626,0_1px_6px_0_rgba(220,38,38,0.58)] hover:translate-y-[1px] hover:scale-[0.99] hover:shadow-[inset_0_-1px_0_0_#dc2626,0_1px_3px_0_rgba(220,38,38,0.4)] active:translate-y-[2px] active:scale-[0.99] active:shadow-[inset_0_1px_1px_0_#dc2626,0_1px_2px_0_rgba(220,38,38,0.3)]`,
                "destructive-outline": "bg-red-100 text-red-400 hover:bg-red-200 border border-red-300",
                outline: "border border-input bg-white hover:bg-accent hover:text-accent-foreground dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-accent-foreground",
                secondary: "text-white transition-colors bg-black hover:bg-zinc-900 shadow-black/20 dark:shadow-black/40",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "rounded h-9 px-4 py-2",
                xs: "h-7 rounded-sm px-2 text-xs gap-1 tracking-normal",
                sm: "rounded px-3 h-8 text-sm",
                lg: "h-11 rounded px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    if (asChild) {
        return <Comp ref={ref} disabled={loading || props.disabled} {...props}>
            <span className={cn(buttonVariants({ variant, size, className }))}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
                {children}
            </span>
        </Comp>;
    }
    return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} disabled={loading || props.disabled} {...props}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
            {children}
        </Comp>
    );
});
Button.displayName = "Button";

export { Button, buttonVariants };
