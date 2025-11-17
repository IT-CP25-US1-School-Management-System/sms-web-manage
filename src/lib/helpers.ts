export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTime = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat("th-TH").format(price);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const getImgInitials = (name: string) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
