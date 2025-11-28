import React from 'react';

export function Toast({ title, description, variant }) {
  const baseClasses = "p-4 rounded-md shadow-lg text-white";
  const variants = {
    default: "bg-blue-500",
    destructive: "bg-red-500",
  };

  return (
    <div className={`${baseClasses} ${variants[variant] || variants.default}`}>
      {title && <div className="font-bold">{title}</div>}
      {description && <div>{description}</div>}
    </div>
  );
}
