import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ArrowLeft, Upload, Camera, FileText, Check } from 'lucide-react';
import { scanReceipt } from '../api';
import { ExtractedData } from '../App';
import { toast } from './ui/use-toast';

interface OCRScannerProps {
  onBack: () => void;
  onScan: (data: ExtractedData) => void;
}

export function OCRScanner({ onBack, onScan }: OCRScannerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setExtractedData(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const processReceipt = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('receipt', selectedFile);

    try {
      const response = await scanReceipt(formData);
      setExtractedData(response.data);
      toast({
        title: 'OCR Scan Complete',
        description: 'Receipt data extracted successfully!',
      });
    } catch (error) {
      console.error("Error processing receipt:", error);
      toast({
        title: 'OCR Scan Failed',
        description: 'Failed to extract data from receipt. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const createExpenseFromReceipt = () => {
    if (extractedData) {
      onScan(extractedData);
      toast({
        title: 'Expense Created',
        description: 'Receipt data sent to expense splitter!',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onBack}
            className="bg-white/10 hover:bg-white/20 border-blue-400/50 text-white"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent">
            OCR Receipt Scanner
          </h1>
        </div>

        {/* Upload Area */}
        {!selectedFile && (
          <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
            <CardContent className="p-8">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver 
                    ? 'border-blue-400 bg-blue-500/20' 
                    : 'border-blue-400/50 hover:border-blue-400 hover:bg-blue-500/10'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-blue-600/20">
                    <Upload className="h-8 w-8 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg mb-2">Upload Receipt</h3>
                    <p className="text-blue-200 mb-4">
                      Drag and drop your receipt image here, or click to browse
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white border-0"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
        />

        {/* Selected File */}
        {selectedFile && !extractedData && (
          <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
            <CardHeader>
              <CardTitle className="text-white">Selected Receipt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <FileText className="h-6 w-6 text-blue-300" />
                <div>
                  <p className="text-white">{selectedFile.name}</p>
                  <p className="text-blue-200 text-sm">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={processReceipt}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white border-0"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Scan Receipt
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setExtractedData(null);
                  }}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 border-blue-400/50 text-white"
                >
                  Choose Different File
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extracted Data */}
        {extractedData && (
          <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                Extracted Receipt Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-blue-200 text-sm">Merchant</p>
                  <p className="text-white">{extractedData.merchantName}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-blue-200 text-sm">Date</p>
                  <p className="text-white">{extractedData.date}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-blue-200 text-sm">Total Amount</p>
                  <p className="text-white text-xl">${extractedData.total.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <h4 className="text-white mb-3">Items</h4>
                <div className="space-y-2">
                  {extractedData.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-white/5 rounded">
                      <span className="text-white">{item.name}</span>
                      <span className="text-blue-200">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={createExpenseFromReceipt}
                  className="bg-gradient-to-r from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 text-white border-0"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Create Expense
                </Button>
                
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setExtractedData(null);
                  }}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 border-blue-400/50 text-white"
                >
                  Scan Another Receipt
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
          <CardHeader>
            <CardTitle className="text-white">Tips for Better Scanning</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-blue-200 space-y-2">
              <li>• Ensure the receipt is well-lit and clearly visible</li>
              <li>• Make sure all text is in focus and not blurry</li>
              <li>• Capture the entire receipt including merchant name and total</li>
              <li>• Avoid shadows or reflections on the receipt</li>
              <li>• Supported formats: JPG, PNG, HEIC</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}