export default function Card({
    children,
    className = '',
    variant = 'glass',
    clickable = false,
    onClick = null,
    ...props
}) {
    const variantClasses = {
        //light mode glass
        glass: `
        bg-OffWhite/10
        dark:bg-OffWhite/5
        backdrop-blur-md
        border
        border-OffWhite/20
        dark:border-OffWhite/10
        shadow-xl
        dark:shadow-2xl
        `,
        //dark mode glass
        dark: `
        bg-OffBlack
        dark:bg-OffBlack
        backdrop-blur-md
        border
        border-Grey/30
        dark:border-DarkGrey/20
        shadow-lg
        dark:shadow-lg`
    };

    const interactiveClasses = clickable
    ? `
    cursor-pointer
    transition-all
    duration-200
    hover:shadow-2xl
    dark:hover:shadow-2xl
    hover:scale-105
    hover:bg-OffWhite/20
    dark:hover:bg-OffWhite/10
    `
    : '';

    return (
        <div onClick={clickable ? onClick : null}
        className={`
            ${variantClasses[variant]}
            ${interactiveClasses}
            rounded-xl
            p-6
            transition-colors
            duration-200
            ${className}
            `}
            {...props}
        >
            {children}
        </div>
    );
}