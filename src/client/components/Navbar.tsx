import { DoorOpen } from "lucide-react";
import ExecSwitch from "./ExecSwitch";

export default function Navbar(props: { code: string; isConnected: boolean }) {
  return (
    <div className="w-full p-4 bg-gray-200 border-b-2 border-gray-300 text-gray-800 z-50 flex justify-between gap-2">
      <a
        href="/"
        className="flex gap-0.5 bg-red-500 font-semibold hover:bg-red-300 transition-colors duration-150 border border-red-500 rounded-xl p-4 text-white hover:text-gray-700"
      >
        <DoorOpen />
        Leave
      </a>
      <div className="justify-items-center">
        <p className="font-semibold text-xl tracking-widest">{props.code}</p>
        <span className="text-xs flex">
          {props.isConnected ? (
            <p className="p-0.5 px-2 rounded-full bg-green-300">connected</p>
          ) : (
            <p className="p-0.5 px-2 rounded-full bg-red-300">
              disconnected - attempting to reconnect...
            </p>
          )}
        </span>
      </div>
      <ExecSwitch />
    </div>
  );
}
