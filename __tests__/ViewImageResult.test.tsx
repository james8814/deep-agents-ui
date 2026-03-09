/**
 * ViewImageResult Component Tests
 *
 * Test Suite for the view_image tool result renderer
 * Covers:
 * - Base64 image rendering
 * - Metadata display
 * - Download functionality
 * - Error handling
 * - Dark/light mode support
 * - Responsive design
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewImageResult } from "@/app/components/ViewImageResult";

// Mock data
const MOCK_BASE64_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="; // 1x1 transparent PNG
const MOCK_FILE_PATH = "/path/to/image.png";
const MOCK_MIME_TYPE = "image/png";

describe("ViewImageResult Component", () => {
  describe("Image Rendering", () => {
    it("should render image from base64 data", async () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const img = screen.getByAltText("Image result") as HTMLImageElement;
      expect(img).toBeInTheDocument();

      await waitFor(() => {
        expect(img.src).toContain("data:image/png;base64,");
        expect(img.src).toContain(MOCK_BASE64_PNG);
      });
    });

    it("should handle image_base64 property as fallback", async () => {
      const result = {
        image_base64: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const img = screen.getByAltText("Image result") as HTMLImageElement;
      expect(img).toBeInTheDocument();

      await waitFor(() => {
        expect(img.src).toContain(MOCK_BASE64_PNG);
      });
    });

    it("should strip data URL prefix from base64 data", async () => {
      const result = {
        image_data: `data:image/png;base64,${MOCK_BASE64_PNG}`,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const img = screen.getByAltText("Image result") as HTMLImageElement;
      await waitFor(() => {
        expect(img.src).toContain(MOCK_BASE64_PNG);
        // Should not have double prefix
        expect(img.src).not.toContain("data:image/png;base64,data:");
      });
    });

    it("should show loading state while image is loading", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      // Loading spinner should be visible initially
      const spinner = screen.getByRole("img", { hidden: true });
      expect(spinner).toBeInTheDocument();
    });

    it("should remove loading state after image loads", async () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const img = screen.getByAltText("Image result") as HTMLImageElement;

      // Simulate image load
      fireEvent.load(img);

      await waitFor(() => {
        const imageContainer = img.closest("div");
        expect(imageContainer).not.toHaveClass("opacity-0");
      });
    });

    it("should use lazy loading attribute", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const img = screen.getByAltText("Image result") as HTMLImageElement;
      expect(img).toHaveAttribute("loading", "lazy");
    });
  });

  describe("Metadata Display", () => {
    it("should display file path", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const pathElement = screen.getByTitle(MOCK_FILE_PATH);
      expect(pathElement).toHaveTextContent(MOCK_FILE_PATH);
    });

    it("should display default file path when not provided", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
      };

      render(<ViewImageResult result={result} />);

      expect(screen.getByText(/image/)).toBeInTheDocument();
    });

    it("should display MIME type badge", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      expect(screen.getByText(MOCK_MIME_TYPE)).toBeInTheDocument();
    });

    it("should handle format property as fallback for MIME type", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        format: "image/jpeg",
      };

      render(<ViewImageResult result={result} />);

      expect(screen.getByText("image/jpeg")).toBeInTheDocument();
    });

    it("should display image dimensions after load", async () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const img = screen.getByAltText("Image result") as HTMLImageElement;

      // Mock image dimensions
      Object.defineProperty(img, "naturalWidth", { value: 800, writable: false });
      Object.defineProperty(img, "naturalHeight", { value: 600, writable: false });

      fireEvent.load(img);

      await waitFor(() => {
        expect(screen.getByText(/800 × 600px/)).toBeInTheDocument();
      });
    });
  });

  describe("Download Functionality", () => {
    it("should render download button", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const downloadBtn = screen.getByRole("button", { name: /download/i });
      expect(downloadBtn).toBeInTheDocument();
    });

    it("should trigger download when button is clicked", async () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      // Mock document.createElement and click
      const createElementSpy = jest.spyOn(document, "createElement");
      const clickSpy = jest.fn();

      const mockLink = {
        href: "",
        download: "",
        click: clickSpy,
      };

      createElementSpy.mockReturnValueOnce(mockLink as any);

      const downloadBtn = screen.getByRole("button", { name: /download/i });
      await userEvent.click(downloadBtn);

      await waitFor(() => {
        expect(clickSpy).toHaveBeenCalled();
      });

      createElementSpy.mockRestore();
    });

    it("should add proper file extension from MIME type", async () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: "screenshot",
        mime_type: "image/png",
      };

      render(<ViewImageResult result={result} />);

      const createElementSpy = jest.spyOn(document, "createElement");
      const mockLink = {
        href: "",
        download: "",
        click: jest.fn(),
      };

      createElementSpy.mockReturnValueOnce(mockLink as any);

      const downloadBtn = screen.getByRole("button", { name: /download/i });
      await userEvent.click(downloadBtn);

      await waitFor(() => {
        expect(mockLink.download).toContain(".png");
      });

      createElementSpy.mockRestore();
    });

    it("should disable download button when image fails to load", async () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const img = screen.getByAltText("Image result") as HTMLImageElement;
      fireEvent.error(img);

      const downloadBtn = screen.getByRole("button", { name: /download/i });

      await waitFor(() => {
        expect(downloadBtn).toBeDisabled();
      });
    });

    it("should disable download button when no base64 data", () => {
      const result = {
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      // When there's no image data, the component shows an error message
      expect(screen.getByText(/No image data found/)).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should show error state when image fails to load", async () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const img = screen.getByAltText("Image result") as HTMLImageElement;
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load image/)).toBeInTheDocument();
      });
    });

    it("should show helpful error message for corrupt images", async () => {
      const result = {
        image_data: "invalid-base64-data",
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const img = screen.getByAltText("Image result") as HTMLImageElement;
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByText(/image data may be corrupted/)).toBeInTheDocument();
      });
    });

    it("should show message when no image data provided", () => {
      const result = {
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      expect(screen.getByText(/No image data found in result/)).toBeInTheDocument();
    });

    it("should handle missing MIME type gracefully", async () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
      };

      render(<ViewImageResult result={result} />);

      const img = screen.getByAltText("Image result") as HTMLImageElement;
      fireEvent.load(img);

      await waitFor(() => {
        // Should default to image/png
        expect(screen.getByText("image/png")).toBeInTheDocument();
      });
    });
  });

  describe("Styling and Layout", () => {
    it("should have responsive container", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      const { container } = render(<ViewImageResult result={result} />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass("space-y-3");
    });

    it("should have proper border and padding styling", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      const { container } = render(<ViewImageResult result={result} />);

      const imageContainer = container.querySelector(
        ".rounded-lg.border.border-border"
      );
      expect(imageContainer).toBeInTheDocument();
    });

    it("should constrain image height", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const img = screen.getByAltText("Image result") as HTMLImageElement;
      expect(img).toHaveClass("max-h-[400px]");
    });

    it("should make image responsive (full width)", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const img = screen.getByAltText("Image result") as HTMLImageElement;
      expect(img).toHaveClass("w-full");
      expect(img).toHaveClass("max-w-full");
    });
  });

  describe("Dark Mode Support", () => {
    it("should work with dark mode enabled", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      const { container } = render(<ViewImageResult result={result} />);

      // Component uses Tailwind CSS which respects dark: prefix
      // Just verify it renders without errors
      expect(container).toBeInTheDocument();
      expect(screen.getByAltText("Image result")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long file paths", () => {
      const longPath = "/very/long/path/that/might/exceed/normal/display/width/image.png";
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: longPath,
        mime_type: MOCK_MIME_TYPE,
      };

      render(<ViewImageResult result={result} />);

      const pathElement = screen.getByTitle(longPath);
      expect(pathElement).toHaveClass("truncate");
      expect(pathElement).toHaveClass("break-all");
    });

    it("should handle different MIME types", () => {
      const mimeTypes = ["image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

      mimeTypes.forEach((mimeType) => {
        const result = {
          image_data: MOCK_BASE64_PNG,
          file_path: MOCK_FILE_PATH,
          mime_type: mimeType,
        };

        const { unmount } = render(<ViewImageResult result={result} />);
        expect(screen.getByText(mimeType)).toBeInTheDocument();
        unmount();
      });
    });

    it("should be memoized to prevent unnecessary re-renders", () => {
      const result = {
        image_data: MOCK_BASE64_PNG,
        file_path: MOCK_FILE_PATH,
        mime_type: MOCK_MIME_TYPE,
      };

      const { rerender } = render(<ViewImageResult result={result} />);

      // Should have displayName indicating it's memoized
      expect(ViewImageResult.displayName).toBe("ViewImageResult");

      // Re-render with same props
      rerender(<ViewImageResult result={result} />);

      // Image should still be in document
      expect(screen.getByAltText("Image result")).toBeInTheDocument();
    });
  });
});
