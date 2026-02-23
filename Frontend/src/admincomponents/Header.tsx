// // src/components/Header.tsx
// import React from "react";
// import { Bell, User, Search } from "./Icons";
// import { Input, Button, DropdownMenu } from "./ui"; // Your shared components

// const Header: React.FC = () => {
//   return (
//     <header className="h-16 border-b border-slate-200 bg-white">
//       <div className="h-full px-6 flex items-center justify-between">
//         {/* Search */}
//         <div className="flex-1 max-w-md">
//           <div className="relative">
//             <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
//               <Search />
//             </div>
//             <Input placeholder="Search donors or campaigns" className="pl-10 bg-slate-50 border-slate-200" />
//           </div>
//         </div>

//         {/* Right Icons */}
//         <div className="flex items-center gap-3">
//           <Button variant="ghost" size="icon" className="relative">
//             <div className="w-5 h-5">
//               <Bell />
//             </div>
//             <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
//           </Button>

//           <DropdownMenu
//             trigger={
//               <Button variant="ghost" size="icon" className="rounded-full">
//                 <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
//                   <div className="w-4 h-4 text-white">
//                     <User />
//                   </div>
//                 </div>
//               </Button>
//             }
//             items={[
//               { label: "Admin Account" },
//               { separator: true },
//               { text: "Profile" },
//               { text: "Settings" },
//               { separator: true },
//               { text: "Log out" },
//             ]}
//           />
//         </div>
//       </div>
//     </header>
//   );
// };

// export default Header;
