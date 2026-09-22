import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate a high-resolution QR code Data URL (PNG)
 */
export async function generateQRCodeDataURL(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions: QRCode.QRCodeToDataURLOptions = {
    width: options.width || 400,
    margin: options.margin !== undefined ? options.margin : 2,
    color: {
      dark: options.color?.dark || '#0c0a09', // Dark stone
      light: options.color?.light || '#ffffff',
    },
    errorCorrectionLevel: 'H', // High error correction to allow logo embedding in center
  };

  try {
    return await QRCode.toDataURL(text, defaultOptions);
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}

/**
 * Generate QR code directly onto a canvas element
 */
export async function renderQRCodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: QRCodeOptions = {}
): Promise<void> {
  const defaultOptions: QRCode.QRCodeRenderersOptions = {
    width: options.width || 360,
    margin: options.margin !== undefined ? options.margin : 2,
    color: {
      dark: options.color?.dark || '#0c0a09',
      light: options.color?.light || '#ffffff',
    },
    errorCorrectionLevel: 'H',
  };

  try {
    await QRCode.toCanvas(canvas, text, defaultOptions);
  } catch (err) {
    console.error('Failed to render QR code on canvas:', err);
    throw err;
  }
}
