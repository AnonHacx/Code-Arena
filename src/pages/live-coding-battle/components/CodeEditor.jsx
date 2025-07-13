import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';


const CodeEditor = ({ 
  code, 
  onCodeChange, 
  onSubmit, 
  isSubmitting, 
  executionResults,
  onFileUpload,
  roomData  // Just receive this prop
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pythonFile = files.find(file => file.name.endsWith('.py'));
    
    if (pythonFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onCodeChange(event.target.result);
      };
      reader.readAsText(pythonFile);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.py')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onCodeChange(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = code.substring(0, start) + '    ' + code.substring(end);
      onCodeChange(newValue);
      
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const insertTemplate = () => {
    const template = `def pyramid_generator(n):
    """
    Generate a pyramid pattern with n levels
    Args:
        n (int): Number of levels in the pyramid
    Returns:
        list: List of strings representing each level
    """
    # Your code here
    pass

# Test your function
if __name__ == "__main__":
    result = pyramid_generator(5)
    for line in result:
        print(line)`;
    onCodeChange(template);
  };

  const getLineNumbers = () => {
    const lines = code.split('\n');
    return lines.map((_, index) => index + 1);
  };

  return (
    <div className={`
      flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden
      ${isFullscreen ? 'fixed inset-4 z-50' : ''}
    `}>
      {/* Editor Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-surface">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Icon name="FileCode" size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">solution.py</span>
          </div>
          
          {code.trim() === '' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={insertTemplate}
              iconName="Plus"
              iconPosition="left"
              className="text-xs"
            >
              Template
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8"
          >
            <Icon name="Upload" size={16} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8"
          >
            <Icon name={isFullscreen ? "Minimize2" : "Maximize2"} size={16} />
          </Button>
        </div>
      </div>

      {/* File Upload Zone */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".py"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Code Editor Area */}
      <div 
        className={`
          flex-1 relative overflow-hidden
          ${isDragOver ? 'bg-primary/5 border-primary' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-10 flex items-center justify-center">
            <div className="text-center">
              <Icon name="Upload" size={48} className="text-primary mx-auto mb-2" />
              <p className="text-primary font-medium">Drop Python file here</p>
            </div>
          </div>
        )}

        <div className="flex h-full">
          {/* Line Numbers */}
          <div className="bg-muted/30 px-3 py-4 text-right border-r border-border min-w-[3rem] flex-shrink-0">
            <div className="text-xs font-mono text-muted-foreground leading-6">
              {getLineNumbers().map(num => (
                <div key={num} className="h-6 flex items-center justify-end">
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* Code Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="# Write your Python solution here...\n# Use the template button to get started"
              className="
                w-full h-full p-4 bg-transparent text-foreground font-mono text-sm
                resize-none outline-none leading-6
                placeholder:text-muted-foreground
              "
              style={{ 
                lineHeight: '1.5rem',
                fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
              }}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Execution Results */}
      {executionResults && (
        <div className="border-t border-border bg-surface">
          <div className="p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Icon 
                name={executionResults.success ? "CheckCircle" : "XCircle"} 
                size={16} 
                className={executionResults.success ? "text-success" : "text-error"}
              />
              <span className="text-sm font-medium text-foreground">
                Execution Results
              </span>
              <span className="text-xs text-muted-foreground">
                ({executionResults.executionTime}ms)
              </span>
            </div>
            
            <div className="space-y-2">
              {executionResults.testCases?.map((testCase, index) => (
                <div 
                  key={index}
                  className={`
                    flex items-center justify-between p-2 rounded text-xs
                    ${testCase.passed 
                      ? 'bg-success/10 text-success border border-success/20' :'bg-error/10 text-error border border-error/20'
                    }
                  `}
                >
                  <span>Test Case {index + 1}</span>
                  <div className="flex items-center space-x-2">
                    <span>{testCase.passed ? 'PASSED' : 'FAILED'}</span>
                    <Icon 
                      name={testCase.passed ? "Check" : "X"} 
                      size={12} 
                    />
                  </div>
                </div>
              ))}
            </div>

            {executionResults.error && (
              <div className="mt-2 p-2 bg-error/10 border border-error/20 rounded">
                <p className="text-xs text-error font-mono">
                  {executionResults.error}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="p-3 border-t border-border bg-surface">
        <Button
          variant="default"
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={!code.trim() || isSubmitting || roomData?.status === 'completed'}
          iconName="Play"
          iconPosition="left"
          fullWidth
          className="font-medium"
        >
          {isSubmitting ? 'Executing...' : roomData?.status === 'completed' ? 'Game Over' : 'Submit Solution'}
        </Button>
      </div>
    </div>
  );
};

export default CodeEditor;