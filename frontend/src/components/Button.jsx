import React from "react";
import "./Button.css";

export default function Button({
  children,
  type = "button",
  variant = "primary", // "primary" | "success" | "danger" | "secondary"
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  className = "",
}) {
  const classes = [
    "btn",
    `btn-${variant}`,
    fullWidth ? "btn-block" : "",
    loading ? "btn-loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      onClick={onClick}
      className={classes}
      disabled={disabled || loading}
    >
      {loading && <span className="spinner"></span>}
      {children}
    </button>
  );
}
