/**
 * Compresses an image file (JPEG/PNG/WebP) using HTML5 Canvas before attaching it to transactions.
 * Shrinks 5MB-10MB mobile/scanner photos down to ~70KB-140KB while retaining high visual clarity
 * for NRC numbers, names, father names, and passport details.
 * For SVGs, PDFs, or tiny files (<150KB), returns the original without modification.
 */
export async function readFileAsOptimizedDataUrl(
  file: File,
  maxDim = 1280,
  quality = 0.75
): Promise<{ dataUrl: string; sizeStr: string; type: string; name: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      resolve({
        dataUrl: '',
        sizeStr: '0 KB',
        type: file.type || 'application/octet-stream',
        name: file.name
      });
    };

    reader.onload = () => {
      const rawUrl = (reader.result as string) || '';
      const isRasterImage = file.type.startsWith('image/') && !file.type.includes('svg');

      // If not a raster image or already small (< 150KB), no need to compress
      if (!isRasterImage || file.size < 150000) {
        const sizeKb = (file.size / 1024).toFixed(1);
        resolve({
          dataUrl: rawUrl,
          sizeStr: `${sizeKb} KB`,
          type: file.type || 'image/jpeg',
          name: file.name
        });
        return;
      }

      try {
        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve({
                dataUrl: rawUrl,
                sizeStr: `${(file.size / 1024).toFixed(1)} KB`,
                type: file.type,
                name: file.name
              });
              return;
            }

            // Fill white background for transparent PNGs
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            const compressedUrl = canvas.toDataURL('image/jpeg', quality);
            const sizeInBytes = Math.round((compressedUrl.length * 3) / 4);
            const sizeKb = (sizeInBytes / 1024).toFixed(1);

            resolve({
              dataUrl: compressedUrl,
              sizeStr: `${sizeKb} KB`,
              type: 'image/jpeg',
              name: file.name.replace(/\.[^/.]+$/, '') + '.jpg'
            });
          } catch {
            resolve({
              dataUrl: rawUrl,
              sizeStr: `${(file.size / 1024).toFixed(1)} KB`,
              type: file.type,
              name: file.name
            });
          }
        };

        img.onerror = () => {
          resolve({
            dataUrl: rawUrl,
            sizeStr: `${(file.size / 1024).toFixed(1)} KB`,
            type: file.type,
            name: file.name
          });
        };

        img.src = rawUrl;
      } catch {
        resolve({
          dataUrl: rawUrl,
          sizeStr: `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type,
          name: file.name
        });
      }
    };

    reader.readAsDataURL(file);
  });
}
