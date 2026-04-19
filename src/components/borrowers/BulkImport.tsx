import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Line, Borrower } from '../../types';

interface ImportRow {
  rowNumber: number;
  serialNumber: string;
  phone: string;
  name: string;
  address: string;
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'importing' | 'success' | 'failed';
  error?: string;
  duplicate?: boolean;
}

export const BulkImport: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedLine, setSelectedLine] = useState<string>('');
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number, failed: number }>({ success: 0, failed: 0 });

  React.useEffect(() => {
    loadLines();
  }, []);

  const loadLines = async () => {
    try {
      const linesData = await dataService.getLines();
      setLines(linesData);
    } catch (error) {
    }
  };

  const downloadTemplate = () => {
    const csv = [
      ['Serial Number', 'Phone Number', 'Customer Name (Telugu)', 'Address (Telugu)'],
      ['C001', '9876543210', 'రాము', 'హైదరాబాద్'],
      ['C002', '9876543211', 'సీత', 'విజయవాడ'],
      ['C003', '9876543212', 'కృష్ణ', 'విశాఖపట్నం']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bulk_import_template.csv';
    link.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');
    const data: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 3) {
        data.push({
          rowNumber: i,
          serialNumber: values[0]?.trim() || '',
          phone: values[1]?.trim() || '',
          name: values[2]?.trim() || '',
          address: values[3]?.trim() || '',
          status: 'pending'
        });
      }
    }

    setImportData(data);
    setStep(2);
  };

  const validateData = async () => {
    setIsProcessing(true);
    const validated = [...importData];

    for (let i = 0; i < validated.length; i++) {
      const row = validated[i];
      row.status = 'validating';
      setImportData([...validated]);

      if (!row.serialNumber) {
        row.status = 'invalid';
        row.error = 'Serial number is required';
      } else if (!row.phone || !/^\d{10}$/.test(row.phone)) {
        row.status = 'invalid';
        row.error = 'Phone number must be 10 digits';
      } else if (!row.name) {
        row.status = 'invalid';
        row.error = 'Name is required';
      } else {
        try {
          const duplicate = await dataService.checkDuplicateBorrower(row.phone, row.serialNumber, selectedLine);
          if (duplicate.exists) {
            row.status = 'invalid';
            row.error = `Duplicate: Phone or serial number already exists`;
            row.duplicate = true;
          } else {
            row.status = 'valid';
          }
        } catch (error) {
          row.status = 'invalid';
          row.error = 'Validation error';
        }
      }

      setImportData([...validated]);
    }

    setIsProcessing(false);
    setStep(3);
  };

  const startImport = async () => {
    if (!selectedLine || !user) return;

    setIsProcessing(true);
    setStep(4);
    let successCount = 0;
    let failedCount = 0;

    const validRows = importData.filter(row => row.status === 'valid');

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      row.status = 'importing';
      setImportData([...importData]);

      try {
        await dataService.createBorrower({
          serialNumber: row.serialNumber,
          phone: row.phone,
          name: row.name,
          address: row.address,
          lineId: selectedLine,
          agentId: user.id
        });

        row.status = 'success';
        successCount++;
      } catch (error: any) {
        row.status = 'failed';
        row.error = error.message;
        failedCount++;
      }

      setProgress(Math.round(((i + 1) / validRows.length) * 100));
      setImportData([...importData]);
    }

    setResults({ success: successCount, failed: failedCount });
    setIsProcessing(false);
  };

  const getStatusIcon = (status: ImportRow['status']) => {
    switch (status) {
      case 'valid':
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'invalid':
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'validating':
      case 'importing':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const validCount = importData.filter(r => r.status === 'valid').length;
  const invalidCount = importData.filter(r => r.status === 'invalid').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Bulk Customer Import</h1>
        <p className="text-gray-600">Import thousands of customers from Excel/CSV files</p>
      </div>

      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map(num => (
          <div key={num} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step >= num ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {num}
            </div>
            {num < 4 && (
              <div className={`w-24 h-1 ${step > num ? 'bg-blue-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="flex items-center gap-4 mb-6">
              <FileSpreadsheet className="w-12 h-12 text-blue-500" />
              <div>
                <h2 className="text-xl font-bold text-gray-800">Step 1: Prepare Your File</h2>
                <p className="text-gray-600">Download template and fill in your customer data</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Download the CSV template below</li>
                <li>Fill in: Serial Number, Phone (10 digits), Name (Telugu), Address (Telugu)</li>
                <li>Serial numbers must be unique within the selected line</li>
                <li>Phone numbers must be unique across all customers</li>
                <li>Save as .csv file with UTF-8 encoding to preserve Telugu text</li>
              </ul>
            </div>

            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition mb-8"
            >
              <Download className="w-5 h-5" />
              Download Template
            </button>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Line *
              </label>
              <select
                value={selectedLine}
                onChange={(e) => setSelectedLine(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Choose a line...</option>
                {lines.map(line => (
                  <option key={line.id} value={line.id}>{line.name}</option>
                ))}
              </select>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={!selectedLine}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer text-blue-600 hover:text-blue-700 font-semibold ${
                  !selectedLine && 'opacity-50 cursor-not-allowed'
                }`}
              >
                Click to upload CSV file
              </label>
              <p className="text-sm text-gray-500 mt-2">
                {selectedLine ? 'CSV files only, UTF-8 encoding' : 'Please select a line first'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-8"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4">Step 2: Preview Data</h2>
          <p className="text-gray-600 mb-6">
            Found {importData.length} customers to import. Review the data below.
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Serial No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {importData.slice(0, 10).map((row) => (
                  <tr key={row.rowNumber} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{row.rowNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{row.serialNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{row.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {importData.length > 10 && (
              <p className="text-sm text-gray-500 text-center mt-4">
                Showing first 10 of {importData.length} rows
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              onClick={validateData}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              Validate Data
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-8"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4">Step 3: Validation Results</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
                <CheckCircle className="w-5 h-5" />
                Valid
              </div>
              <div className="text-3xl font-bold text-green-700">{validCount}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                <XCircle className="w-5 h-5" />
                Invalid
              </div>
              <div className="text-3xl font-bold text-red-700">{invalidCount}</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-gray-700 font-semibold mb-1">Total</div>
              <div className="text-3xl font-bold text-gray-700">{importData.length}</div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto mb-6">
            {importData.map((row) => (
              <div
                key={row.rowNumber}
                className={`flex items-center gap-4 p-4 mb-2 rounded-lg border ${
                  row.status === 'valid' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                {getStatusIcon(row.status)}
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    Row {row.rowNumber}: {row.serialNumber} - {row.name} ({row.phone})
                  </div>
                  {row.error && (
                    <div className="text-sm text-red-600 mt-1">{row.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              onClick={startImport}
              disabled={validCount === 0 || isProcessing}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              Import {validCount} Valid Customers
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-8"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4">Step 4: Import Progress</h2>

          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {!isProcessing && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                  <CheckCircle className="w-6 h-6" />
                  Successfully Imported
                </div>
                <div className="text-4xl font-bold text-green-700">{results.success}</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                  <XCircle className="w-6 h-6" />
                  Failed
                </div>
                <div className="text-4xl font-bold text-red-700">{results.failed}</div>
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto mb-6">
            {importData.filter(r => r.status !== 'pending' && r.status !== 'valid').map((row) => (
              <div
                key={row.rowNumber}
                className="flex items-center gap-4 p-4 mb-2 rounded-lg border bg-gray-50 border-gray-200"
              >
                {getStatusIcon(row.status)}
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    {row.serialNumber} - {row.name} ({row.phone})
                  </div>
                  {row.error && row.status === 'failed' && (
                    <div className="text-sm text-red-600 mt-1">{row.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isProcessing && (
            <button
              onClick={() => {
                setStep(1);
                setImportData([]);
                setProgress(0);
                setResults({ success: 0, failed: 0 });
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Import More Customers
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};
