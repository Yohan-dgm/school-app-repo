import React from "react";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

export function TInput(props: React.ComponentProps<any>) {
  const { className, ...otherProps } = props;

  const lightThemeClassName = cn(
    "bg-white text-gray-900 border-gray-300 placeholder:text-gray-500",
    "web:focus-visible:ring-gray-400",
    className,
  );

  return <Input {...otherProps} className={lightThemeClassName} />;
}
