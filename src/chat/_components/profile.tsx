
import { User } from "lucide-react";
import Image from "@/components/next-image";
import { PropsWithChildren } from "react";
import { getColorFromString } from "@/lib/color-utils";

export default function Profile({
    name,
    children,
    size,
    url,
}: PropsWithChildren<{ name?: string; size?: string; url?: string }>) {
    const sizeClass =
        {
            6: "w-6 h-6",
            7: "w-7 h-7",
            8: "w-8 h-8",
            10: "w-10 h-10",
            11: "w-11 h-11",
            12: "w-12 h-12",
        }[size ?? 7] ?? "w-7 h-7";
    const firstTwoLetters = name ? name.slice(0, 2).toUpperCase() : null;
    const bgColor = name ? getColorFromString(name) : "#3f3f46";

    const renderAvatar = () => {
        if (url && url.length > 0) {
            return (
                <div
                    className={`${sizeClass} flex justify-center items-center`}
                    style={{ backgroundColor: bgColor }}
                >
                    <Image
                        src={url}
                        className={sizeClass}
                        height={20}
                        width={20}
                        alt="profile"
                    />
                </div>
            );
        } 
        return (
            <div className="flex items-center justify-center w-full h-full overflow-hidden">
                {firstTwoLetters ? <span className="font-medium text-white">{firstTwoLetters}</span> : <User className={`text-white size-5`} />}
            </div>
        );
    };

    return (
        <section
            className={`${sizeClass} overflow-hidden relative flex justify-center items-center rounded-full cursor-pointer`}
            style={{ backgroundColor: bgColor }}
        >
            {children ?? renderAvatar()}
        </section>
    );
}
