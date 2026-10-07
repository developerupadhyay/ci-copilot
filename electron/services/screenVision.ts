import { desktopCapturer, screen, app } from 'electron';
import { execFile } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export async function captureFullScreen(): Promise<string | null> {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const scaleFactor = primaryDisplay.scaleFactor || 1;
    const width = Math.round((primaryDisplay.bounds?.width || primaryDisplay.size.width) * scaleFactor);
    const height = Math.round((primaryDisplay.bounds?.height || primaryDisplay.size.height) * scaleFactor);

    // Strategy 1: desktopCapturer thumbnail
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height },
      });

      const primarySource = sources.find((s) => s.id.startsWith('screen')) || sources[0];
      if (primarySource && !primarySource.thumbnail.isEmpty()) {
        const dataUrl = primarySource.thumbnail.toDataURL();
        if (dataUrl && dataUrl.length > 100) {
          console.log('[CaptureScreen] Captured via desktopCapturer primary source');
          return dataUrl;
        }
      }

      for (const s of sources) {
        if (!s.thumbnail.isEmpty()) {
          const dataUrl = s.thumbnail.toDataURL();
          if (dataUrl && dataUrl.length > 100) {
            return dataUrl;
          }
        }
      }
    } catch (dcErr) {
      console.warn('[CaptureScreen] desktopCapturer error, falling back:', dcErr);
    }

    // Strategy 2: macOS native screencapture fallback
    if (process.platform === 'darwin') {
      try {
        const tmpFile = path.join(app.getPath('temp'), `screen_capture_${Date.now()}.png`);
        const captured = await new Promise<boolean>((resolve) => {
          execFile('/usr/sbin/screencapture', ['-x', '-t', 'png', tmpFile], (err) => {
            if (err || !fs.existsSync(tmpFile)) resolve(false);
            else resolve(true);
          });
        });

        if (captured && fs.existsSync(tmpFile)) {
          const buffer = fs.readFileSync(tmpFile);
          try {
            fs.unlinkSync(tmpFile);
          } catch {}
          return `data:image/png;base64,${buffer.toString('base64')}`;
        }
      } catch (macErr) {
        console.warn('[CaptureScreen] macOS screencapture fallback error:', macErr);
      }
    }

    // Strategy 3: Windows PowerShell GDI fallback
    if (process.platform === 'win32') {
      try {
        const psCode = `Add-Type -AssemblyName System.Windows.Forms, System.Drawing; $s = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $b = New-Object System.Drawing.Bitmap($s.Width, $s.Height); $g = [System.Drawing.Graphics]::FromImage($b); $g.CopyFromScreen($s.Location, [System.Drawing.Point]::Empty, $s.Size); $ms = New-Object System.IO.MemoryStream; $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $b64 = [Convert]::ToBase64String($ms.ToArray()); $g.Dispose(); $b.Dispose(); $ms.Dispose(); [Console]::Out.Write($b64);`;
        const base64 = await new Promise<string | null>((resolve) => {
          execFile(
            'powershell',
            ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCode],
            { maxBuffer: 30 * 1024 * 1024, windowsHide: true },
            (err, stdout) => {
              if (err || !stdout || stdout.trim().length < 50) resolve(null);
              else resolve(stdout.trim());
            }
          );
        });
        if (base64) {
          return `data:image/png;base64,${base64}`;
        }
      } catch (psErr) {
        console.warn('[CaptureScreen] Windows PowerShell capture error:', psErr);
      }
    }

    return null;
  } catch (err) {
    console.error('[CaptureScreen] Error capturing screen:', err);
    return null;
  }
}
