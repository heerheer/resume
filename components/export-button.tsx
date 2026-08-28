"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import type { ResumeData } from "@/types/resume";
import { generatePdfFilename, exportToMagicyanFile, downloadFile, cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { Options as HtmlToImageOptions } from "html-to-image/lib/types";

interface ExportButtonProps {
  resumeData: ResumeData;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showImageOptions?: boolean; // 在没有预览面板时可关闭图片导出
}

export function ExportButton({
  resumeData,
  variant = "default",
  size = "default",
  className,
  showImageOptions = true,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // 在当前页面查找可用于导出的预览节点；若不存在则临时渲染一个离屏预览
  const ensurePreviewForExport = async (): Promise<{ sourceEl: HTMLElement; cleanup: () => void }> => {
    const existing = document.querySelector(".resume-preview") as HTMLElement | null;
    if (existing) {
      return { sourceEl: existing, cleanup: () => { } };
    }

    // 动态挂载一个离屏预览以支持图片导出
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "-10000px";
    host.style.opacity = "0";
    host.style.pointerEvents = "none";
    host.className = "pdf-preview-mode"; // 采用 PDF 预览尺寸，导出清晰
    document.body.appendChild(host);

    const [{ createRoot }, { default: ResumePreview }] = await Promise.all([
      import("react-dom/client"),
      import("./resume-preview"),
    ]);

    const root = createRoot(host);
    root.render(React.createElement(ResumePreview, { resumeData }));

    // 等待渲染与布局生效
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
    const source = host.querySelector(".resume-preview") as HTMLElement | null;
    if (!source) {
      root.unmount();
      host.remove();
      throw new Error("无法生成预览内容用于导出");
    }

    const cleanup = () => {
      try { root.unmount(); } catch { }
      if (host.parentNode) host.parentNode.removeChild(host);
    };
    return { sourceEl: source, cleanup };
  };

  const exportAsImage = async (format: "png" | "jpg" | "webp" | "svg") => {
    setIsExporting(true);

    try {
      const { sourceEl: resumeElement, cleanup: cleanupPreview } = await ensurePreviewForExport();

      // 为了避免跨域图片导致的画布污染，导出时使用克隆节点，并将远程图片通过同源代理加载
      const { nodeForExport, cleanup } = await prepareNodeForExport(resumeElement);
      try {
        if (format === "svg") {
          await exportAsSVG(nodeForExport);
          return;
        }

        // 动态导入 html-to-image
        const htmlToImage = await import("html-to-image");

        // 根据格式选择对应的方法
        let dataUrl: string;
        const options: HtmlToImageOptions = {
          quality: format === "jpg" ? 0.95 : 1,
          pixelRatio: 2, // 提高清晰度
          backgroundColor: "#ffffff",
          cacheBust: true,
          imagePlaceholder:
            // 1x1 透明像素，若有图片加载失败用于占位，避免抛错
            "data:image/gif;base64,R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
          // 关闭字体内嵌，避免 html-to-image 在解析字体时对 undefined 调用 trim 抛错
          skipFonts: true,
        };

        switch (format) {
          case "png":
            dataUrl = await htmlToImage.toPng(nodeForExport, options);
            break;
          case "jpg":
            dataUrl = await htmlToImage.toJpeg(nodeForExport, options);
            break;
          case "webp":
            // html-to-image 没有直接的 toWebp 方法，使用 toBlob 然后转换
            const blob = await htmlToImage.toBlob(nodeForExport, options);
            if (!blob) throw new Error("生成 WEBP 失败");
            // 浏览器支持 canvas 转 webp：将 PNG/JPEG Blob 转换为 webp
            // 若不支持，将保留原始 blob 类型
            const webpUrl = await convertBlobToFormat(blob, "image/webp");
            dataUrl = webpUrl ?? URL.createObjectURL(blob);
            break;
          default:
            throw new Error("不支持的格式");
        }

        // 下载图片
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = generatePdfFilename(resumeData.title).replace(
          ".pdf",
          `.${format}`
        );
        link.click();

        // 清理 URL（如果是 blob URL）
        if (dataUrl.startsWith("blob:")) {
          URL.revokeObjectURL(dataUrl);
        }
      } finally {
        // 移除导出时创建的克隆节点
        cleanup();
        // 若使用了离屏预览，进行清理
        cleanupPreview();
      }

      toast({
        title: "导出成功",
        description: `简历已导出为 ${format.toUpperCase()} 格式`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e || {});
      console.error("导出图片失败:", msg);
      toast({
        title: "导出失败",
        description: `导出图片时发生错误：${msg}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsSVG = async (element: HTMLElement) => {
    try {
      // 使用 html-to-image 的 toSvg 方法
      const htmlToImage = await import("html-to-image");

      const dataUrl = await htmlToImage.toSvg(element, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
        imagePlaceholder:
          "data:image/gif;base64,R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
        // 同样关闭 SVG 导出时的字体内嵌，绕过 html-to-image 的字体解析 bug
        skipFonts: true,
      } as HtmlToImageOptions);

      // 下载 SVG
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = generatePdfFilename(resumeData.title).replace(
        ".pdf",
        ".svg"
      );
      link.click();

      toast({
        title: "导出成功",
        description: "简历已导出为 SVG 格式",
      });
    } catch (error) {
      console.error("导出 SVG 失败:", error);
      throw error;
    }
  };

  // 将节点克隆到离屏容器，并将潜在的跨域图片改为通过同源代理加载
  async function prepareNodeForExport(source: HTMLElement): Promise<{ nodeForExport: HTMLElement; cleanup: () => void }> {
    const clone = source.cloneNode(true) as HTMLElement;
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "-10000px";
    container.style.opacity = "0";
    container.style.pointerEvents = "none";
    // 固定宽高，避免在离屏容器内发生重排导致尺寸变化
    const rect = source.getBoundingClientRect();
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    container.appendChild(clone);
    document.body.appendChild(container);

    const imgs = Array.from(clone.querySelectorAll<HTMLImageElement>("img"));
    const originalSrc: Array<{ el: HTMLImageElement; src: string }> = [];

    const sameOrigin = (url: string) => {
      try {
        const u = new URL(url, window.location.href);
        return u.origin === window.location.origin;
      } catch { return true; }
    };

    // 将远程图片切换为同源代理，避免 canvas 污染
    for (const img of imgs) {
      const src = img.getAttribute("src") || "";
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) continue;
      if (!/^https?:\/\//i.test(src)) continue;
      if (sameOrigin(src)) continue;
      originalSrc.push({ el: img, src });
      const proxied = `/api/image-proxy?url=${encodeURIComponent(src)}`;
      img.setAttribute("src", proxied);
      img.removeAttribute("crossorigin");
    }

    // 等待图片加载，最多等待 5 秒
    await waitForImages(imgs, 5000);

    const cleanup = () => {
      // 不需要恢复 clone 的 src，因为会整体移除
      if (container.parentNode) container.parentNode.removeChild(container);
    };
    return { nodeForExport: clone, cleanup };
  }

  function waitForImages(images: HTMLImageElement[], timeout = 5000) {
    const pending = images.filter((img) => !img.complete || img.naturalWidth === 0);
    if (pending.length === 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      const t = window.setTimeout(finish, timeout);
      let remaining = pending.length;
      const onLoad = () => {
        remaining -= 1;
        if (remaining <= 0) { window.clearTimeout(t); finish(); }
      };
      for (const img of pending) {
        img.addEventListener("load", onLoad, { once: true });
        img.addEventListener("error", onLoad, { once: true });
      }
    });
  }

  async function convertBlobToFormat(blob: Blob, mime: string): Promise<string | null> {
    try {
      if (!("createImageBitmap" in window)) return null;
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bmp, 0, 0);
      const dataUrl = canvas.toDataURL(mime);
      try { bmp.close(); } catch { }
      return dataUrl && dataUrl.startsWith("data:") ? dataUrl : null;
    } catch {
      return null;
    }
  }

  const exportAsPDF = () => {
    const filename = generatePdfFilename(resumeData.title || "");
    const childWindow = window.open(`/pdf/preview/${filename}`, '_blank');
    if (!childWindow) {
      console.error('Failed to open popup window');
      toast({
        title: "导出失败",
        description: "无法打开 PDF 预览窗口，请检查浏览器弹窗设置",
        variant: "destructive",
      });
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.source === childWindow && event.data.type === 'ready') {
        childWindow.postMessage({ type: 'resumeData', data: resumeData }, '*');
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    // 设置超时，如果子窗口没有准备好
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
    }, 5000); // 5秒超时
  };

  const exportAsJSON = () => {
    try {
      const fileContent = exportToMagicyanFile(resumeData);
      const filename = generatePdfFilename(resumeData.title || "").replace(".pdf", ".json");
      downloadFile(fileContent, filename, "application/json");
      toast({
        title: "导出成功",
        description: `简历已导出为 JSON 格式`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e || {});
      console.error("导出 JSON 失败:", msg);
      toast({
        title: "导出失败",
        description: `导出 JSON 时发生错误：${msg}`,
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isExporting}
          className={cn(
            "gap-2 cursor-pointer",
            className,
            variant === "default" ? "bg-green-600 hover:bg-green-700 text-white" : undefined
          )}
        >
          <Icon icon="mdi:download" className="w-4 h-4" />
          {isExporting ? "导出中..." : "导出"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsPDF}>
          <Icon icon="mdi:file-pdf-box" className="w-4 h-4 mr-2" />
          PDF 格式
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsJSON}>
          <Icon icon="mdi:code-json" className="w-4 h-4 mr-2" />
          JSON 格式
        </DropdownMenuItem>
        {showImageOptions && (
          <>
            <DropdownMenuItem onClick={() => exportAsImage("png")}>
              <Icon icon="mdi:file-image" className="w-4 h-4 mr-2" />
              PNG 格式
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAsImage("jpg")}>
              <Icon icon="mdi:file-jpg-box" className="w-4 h-4 mr-2" />
              JPG 格式
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAsImage("webp")}>
              <Icon icon="mdi:file-image" className="w-4 h-4 mr-2" />
              WEBP 格式
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAsImage("svg")}>
              <Icon icon="mdi:svg" className="w-4 h-4 mr-2" />
              SVG 格式
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportButton;
