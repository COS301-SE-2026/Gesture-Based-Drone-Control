// import { Input as ShadcnInput } from '@/components/ui/input';
// import { Eye, EyeOff } from 'lucide-react';
// import { useState } from 'react';

// export default function Input({
//     type= 'text',
//     placeHolder = '',
//     icon: Icon = null,
//     error = false,
//     errorMessage = '',
//     className = '',
//     value,
//     onChange,
//     disabled = false,
//     ...props
// }) {
//     const [showPass, setShowPass] = useState(false);

//     const togglePassVisibility = () => {
//         setShowPass(!showPass);
//     };

//     const inputType = type === 'password' && showPass ? 'text' : type;


//     return (
//         <div className="w-full">
//             <div className={`relative flex items-center ${className}`}>
//                 {Icon && (
//                     <Icon className="absolute left-3 w-5 h-5 text-Grey pointer-events-none" />
//                 )}

//                 <ShadcnInput
//                     type={inputType}
//                     placeHolder={placeHolder}
//                     value={value}
//                     onChange={onChange}
//                     disabled={disabled}
//                     className={`
//                             ${Icon ? 'pl-10' : 'pl-4'}
//                             ${type === 'password' ? 'pr-10' : 'pr-4'}
//                             h-10
//                             rounded-lg
//                             border
//                             ${ error ? 'border-DarkRed focus:border-Red focus:ring-Red' : 'border-Grey focus:border-Red focus:ring-Red dark:border-DarkGrey'}
//                             dark:bg-OffBlack
//                             dark:text-OffWhite
//                             dark:placeholder-DarkGrey
//                             transition-colors
//                             duration-200
//                         `}
//                         {...props}
//                 />

//                 {type === 'password' && (
//                     <button type="button" onClick={togglePassVisibility} className="absolute right-3 text-Grey hover:text-gray-600 dark:hover:text-gray-300" >
//                         {showPass ? (
//                             <EyeOff className="w-5 h-5" />
//                         ) : ( 
//                             <Eye className="w-5 h-5" />
//                         )}
//                     </button>
//                 )}
//             </div>

//             {error && errorMessage && (
//                 <p className="text=sm text-Red mt-1">{errorMessage}</p>
//             )}
//         </div>
//     );
// }

