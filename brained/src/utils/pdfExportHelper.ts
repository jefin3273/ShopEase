/**
 * PDF Export Helper - Handles color format conversion for html2canvas
 * 
 * html2canvas doesn't support modern CSS color functions like oklch(), lab(), lch(), etc.
 * This helper temporarily converts them to RGB before capturing.
 */

interface ColorMapping {
  original: string;
  replacement: string;
}

/**
 * Convert OKLCH to RGB (approximate conversion)
 * OKLCH format: oklch(L C H) or oklch(L C H / A)
 */
function oklchToRgb(l: number, c: number, h: number, alpha: number = 1): string {
  // Convert OKLCH to RGB (simplified conversion)
  // For grayscale colors (c = 0), it's straightforward
  if (c === 0) {
    const rgb = Math.round(l * 255);
    return alpha === 1 ? `rgb(${rgb}, ${rgb}, ${rgb})` : `rgba(${rgb}, ${rgb}, ${rgb}, ${alpha})`;
  }

  // For colored values, use a more complete conversion
  // This is a simplified version - for production, consider using a library
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // Convert Lab to XYZ
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;

  const xr = fx > 0.2068966 ? fx ** 3 : (fx - 16 / 116) / 7.787;
  const yr = fy > 0.2068966 ? fy ** 3 : (fy - 16 / 116) / 7.787;
  const zr = fz > 0.2068966 ? fz ** 3 : (fz - 16 / 116) / 7.787;

  const x = xr * 95.047;
  const y = yr * 100.0;
  const z = zr * 108.883;

  // Convert XYZ to RGB
  let r = x * 0.032406 + y * -0.015372 + z * -0.004986;
  let g = x * -0.009689 + y * 0.018758 + z * 0.00041;
  let bl = x * 0.000557 + y * -0.002040 + z * 0.010570;

  // Apply gamma correction
  r = r > 0.0031308 ? 1.055 * r ** (1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * g ** (1 / 2.4) - 0.055 : 12.92 * g;
  bl = bl > 0.0031308 ? 1.055 * bl ** (1 / 2.4) - 0.055 : 12.92 * bl;

  // Clamp and convert to 0-255
  const red = Math.max(0, Math.min(255, Math.round(r * 255)));
  const green = Math.max(0, Math.min(255, Math.round(g * 255)));
  const blue = Math.max(0, Math.min(255, Math.round(bl * 255)));

  return alpha === 1 
    ? `rgb(${red}, ${green}, ${blue})` 
    : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Convert Oklab to RGB
 * Oklab format: oklab(L a b) or oklab(L a b / A)
 */
function oklabToRgb(l: number, a: number, b: number, alpha: number = 1): string {
  // Convert Oklab to linear RGB
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // Apply gamma correction
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  bl = bl > 0.0031308 ? 1.055 * Math.pow(bl, 1 / 2.4) - 0.055 : 12.92 * bl;

  // Clamp and convert to 0-255
  const red = Math.max(0, Math.min(255, Math.round(r * 255)));
  const green = Math.max(0, Math.min(255, Math.round(g * 255)));
  const blue = Math.max(0, Math.min(255, Math.round(bl * 255)));

  return alpha === 1 
    ? `rgb(${red}, ${green}, ${blue})` 
    : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Parse oklab() color string and convert to RGB
 * Supports both decimal (0.5) and percentage (50%) formats
 */
function parseOklab(oklabString: string): string {
  // Match: oklab(L a b) or oklab(L a b / A)
  const match = oklabString.match(/oklab\(([\d.+-]+%?)\s+([\d.+-]+%?)\s+([\d.+-]+%?)(?:\s*\/\s*([\d.]+%?))?\)/);
  
  if (!match) {
    console.warn(`Failed to parse oklab: ${oklabString}`);
    return 'rgb(255, 255, 255)'; // Fallback to white
  }

  // Parse L value (handle percentage or decimal)
  let l = parseFloat(match[1]);
  if (match[1].includes('%')) {
    l = l / 100;
  }

  // Parse a and b values (handle percentage or decimal)
  let a = parseFloat(match[2]);
  if (match[2].includes('%')) {
    a = a / 100;
  }

  let b = parseFloat(match[3]);
  if (match[3].includes('%')) {
    b = b / 100;
  }

  // Parse alpha
  let alpha = 1;
  if (match[4]) {
    alpha = parseFloat(match[4]);
    if (match[4].includes('%')) {
      alpha = alpha / 100;
    }
  }

  return oklabToRgb(l, a, b, alpha);
}

/**
 * Parse oklch() color string and convert to RGB
 * Supports both decimal (0.977) and percentage (97.7%) formats
 */
function parseOklch(oklchString: string): string {
  // Match: oklch(L C H) or oklch(L C H / A)
  // L can be decimal (0-1) or percentage (0-100%)
  const match = oklchString.match(/oklch\(([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\)/);
  
  if (!match) {
    console.warn(`Failed to parse oklch: ${oklchString}`);
    return 'rgb(255, 255, 255)'; // Fallback to white
  }

  // Parse L value (handle percentage or decimal)
  let l = parseFloat(match[1]);
  if (match[1].includes('%')) {
    l = l / 100; // Convert percentage to decimal
  }

  const c = parseFloat(match[2]);
  const h = parseFloat(match[3]);
  
  // Parse alpha (handle percentage or decimal)
  let alpha = 1;
  if (match[4]) {
    alpha = parseFloat(match[4]);
    if (match[4].includes('%')) {
      alpha = alpha / 100;
    }
  }

  return oklchToRgb(l, c, h, alpha);
}

/**
 * Common OKLCH to RGB mappings for better color accuracy
 */
const COMMON_OKLCH_MAPPINGS: Record<string, string> = {
  'oklch(1 0 0)': 'rgb(255, 255, 255)',           // white
  'oklch(0.145 0 0)': 'rgb(37, 37, 37)',          // very dark gray
  'oklch(0.205 0 0)': 'rgb(52, 52, 52)',          // dark gray
  'oklch(0.97 0 0)': 'rgb(247, 247, 247)',        // very light gray
  'oklch(0.985 0 0)': 'rgb(251, 251, 251)',       // almost white
  'oklch(0.556 0 0)': 'rgb(142, 142, 142)',       // medium gray
  'oklch(0.922 0 0)': 'rgb(235, 235, 235)',       // light gray
  'oklch(0.708 0 0)': 'rgb(180, 180, 180)',       // gray
  'oklch(0.577 0.245 27.325)': 'rgb(220, 38, 38)', // red (destructive)
  'oklch(0.646 0.222 41.116)': 'rgb(234, 179, 8)', // amber (chart-1)
  'oklch(0.6 0.118 184.704)': 'rgb(34, 197, 94)',  // green (chart-2)
  'oklch(0.398 0.07 227.392)': 'rgb(59, 130, 246)', // blue (chart-3)
  'oklch(0.828 0.189 84.429)': 'rgb(251, 146, 60)', // orange (chart-4)
  'oklch(0.769 0.188 70.08)': 'rgb(234, 179, 8)',  // yellow (chart-5)
};

/**
 * Convert oklch() colors to RGB
 */
function convertOklchToRgb(oklchString: string): string {
  // Check common mappings first for better accuracy
  const normalized = oklchString.trim();
  if (COMMON_OKLCH_MAPPINGS[normalized]) {
    return COMMON_OKLCH_MAPPINGS[normalized];
  }

  // Parse and convert
  return parseOklch(oklchString);
}

/**
 * Convert modern color functions (oklch, oklab) to RGB
 */
function convertModernColorToRgb(colorString: string): string {
  if (colorString.includes('oklch')) {
    return convertOklchToRgb(colorString);
  } else if (colorString.includes('oklab')) {
    return parseOklab(colorString);
  }
  return colorString;
}

/**
 * Temporarily replace OKLCH/Oklab colors with RGB equivalents for html2canvas
 */
export function prepareElementForCapture(element: HTMLElement): () => void {
  const mappings: ColorMapping[] = [];
  const styles = getComputedStyle(element);
  
  // Get all CSS variables
  const cssVariables: string[] = [];
  for (let i = 0; i < styles.length; i++) {
    const prop = styles[i];
    if (prop.startsWith('--')) {
      cssVariables.push(prop);
    }
  }

  // Convert CSS variables
  cssVariables.forEach(varName => {
    const value = styles.getPropertyValue(varName).trim();
    if (value.includes('oklch') || value.includes('oklab')) {
      const rgbValue = convertModernColorToRgb(value);
      element.style.setProperty(varName, rgbValue);
      mappings.push({ original: value, replacement: rgbValue });
    }
  });

  // Also handle inline styles and computed styles with oklch/oklab
  const allElements = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
  
  allElements.forEach(el => {
    const computedStyle = getComputedStyle(el);
    
    // Properties that might contain oklch or oklab
    const colorProperties = [
      'color',
      'background-color',
      'border-color',
      'border-top-color',
      'border-right-color',
      'border-bottom-color',
      'border-left-color',
      'outline-color',
      'fill',
      'stroke',
    ];

    colorProperties.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && (value.includes('oklch') || value.includes('oklab'))) {
        const rgbValue = convertModernColorToRgb(value);
        el.style.setProperty(prop, rgbValue, 'important');
        mappings.push({ original: value, replacement: rgbValue });
      }
    });

    // Handle background-image for gradients
    const bgImage = computedStyle.getPropertyValue('background-image');
    if (bgImage && (bgImage.includes('oklch') || bgImage.includes('oklab'))) {
      let convertedBg = bgImage;
      
      // Convert oklch colors
      const oklchMatches = bgImage.match(/oklch\([^)]+\)/g);
      if (oklchMatches) {
        oklchMatches.forEach(oklch => {
          const rgb = convertOklchToRgb(oklch);
          convertedBg = convertedBg.replace(oklch, rgb);
        });
      }
      
      // Convert oklab colors
      const oklabMatches = bgImage.match(/oklab\([^)]+\)/g);
      if (oklabMatches) {
        oklabMatches.forEach(oklab => {
          const rgb = parseOklab(oklab);
          convertedBg = convertedBg.replace(oklab, rgb);
        });
      }
      
      el.style.setProperty('background-image', convertedBg, 'important');
      mappings.push({ original: bgImage, replacement: convertedBg });
    }
  });

  console.log(`Converted ${mappings.length} oklch/oklab colors to RGB for PDF export`);

  // Return cleanup function
  return () => {
    // Restore original styles
    cssVariables.forEach(varName => {
      element.style.removeProperty(varName);
    });
    
    allElements.forEach(el => {
      el.style.removeProperty('color');
      el.style.removeProperty('background-color');
      el.style.removeProperty('border-color');
      el.style.removeProperty('background-image');
    });
  };
}

/**
 * Enhanced PDF export with automatic color conversion
 */
export async function exportToPDF(
  element: HTMLElement,
  filename: string,
  options: {
    scale?: number;
    useCORS?: boolean;
    allowTaint?: boolean;
    backgroundColor?: string;
  } = {}
): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  const jsPDF = (await import('jspdf')).default;

  // Prepare element (convert oklch to rgb)
  const cleanup = prepareElementForCapture(element);

  try {
    // Wait a bit for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture with html2canvas
    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      useCORS: options.useCORS ?? true,
      allowTaint: options.allowTaint ?? false,
      backgroundColor: options.backgroundColor || '#ffffff',
      logging: false,
    });

    // Create PDF
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF({
      orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename);

    console.log('PDF exported successfully');
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  } finally {
    // Cleanup (restore original styles)
    cleanup();
  }
}

/**
 * Capture element as canvas with color conversion
 */
export async function captureAsCanvas(
  element: HTMLElement,
  options: {
    scale?: number;
    useCORS?: boolean;
    allowTaint?: boolean;
    backgroundColor?: string;
  } = {}
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas')).default;

  // Prepare element (convert oklch to rgb)
  const cleanup = prepareElementForCapture(element);

  try {
    // Wait for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture with html2canvas
    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      useCORS: options.useCORS ?? true,
      allowTaint: options.allowTaint ?? false,
      backgroundColor: options.backgroundColor || '#ffffff',
      logging: false,
    });

    return canvas;
  } finally {
    // Cleanup (restore original styles)
    cleanup();
  }
}
