import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ChallengePanel = ({ isVisible, onToggle, challenge }) => {
  const [activeTab, setActiveTab] = useState('description');

  const tabs = [
    { id: 'description', label: 'Problem', icon: 'FileText' },
    { id: 'examples', label: 'Examples', icon: 'Code' },
    { id: 'constraints', label: 'Constraints', icon: 'AlertCircle' }
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-20 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={onToggle}
          className="bg-card border-border shadow-competitive"
        >
          <Icon name={isVisible ? "X" : "FileText"} size={20} />
        </Button>
      </div>

      {/* Challenge Panel */}
      <div className={`
        fixed lg:relative top-0 right-0 h-full w-full lg:w-96 
        bg-card border-l border-border shadow-elevated lg:shadow-none
        transform transition-transform duration-300 ease-in-out z-40
        ${isVisible ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Challenge Details</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center space-x-2 px-3 py-3 text-sm font-medium
                  transition-colors duration-200 border-b-2
                  ${activeTab === tab.id 
                    ? 'text-primary border-primary bg-primary/5' :'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50'
                  }
                `}
              >
                <Icon name={tab.icon} size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'description' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {challenge.title}
                  </h3>
                  <div className="flex items-center space-x-4 mb-4">
                    <span className={`
                      px-2 py-1 rounded text-xs font-medium
                      ${challenge.difficulty === 'Easy' ? 'bg-success/20 text-success' :
                        challenge.difficulty === 'Medium'? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'}
                    `}>
                      {challenge.difficulty}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {challenge.timeLimit} minutes
                    </span>
                  </div>
                </div>
                
                <div className="prose prose-invert max-w-none">
                  <p className="text-foreground leading-relaxed">
                    {challenge.description}
                  </p>
                </div>

                <div className="bg-surface rounded-lg p-4 border border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Function Signature</h4>
                  <code className="block bg-muted p-3 rounded text-sm font-mono text-foreground">
                    {challenge.functionSignature}
                  </code>
                </div>
              </div>
            )}

            {activeTab === 'examples' && (
              <div className="space-y-4">
                {challenge.examples.map((example, index) => (
                  <div key={index} className="bg-surface rounded-lg p-4 border border-border">
                    <h4 className="text-sm font-semibold text-foreground mb-3">
                      Example {index + 1}
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Input:
                        </span>
                        <code className="block bg-muted p-2 rounded text-sm font-mono text-foreground mt-1">
                          {example.input}
                        </code>
                      </div>
                      
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Output:
                        </span>
                        <code className="block bg-muted p-2 rounded text-sm font-mono text-foreground mt-1">
                          {example.output}
                        </code>
                      </div>
                      
                      {example.explanation && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Explanation:
                          </span>
                          <p className="text-sm text-foreground mt-1">
                            {example.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'constraints' && (
              <div className="space-y-4">
                <div className="bg-surface rounded-lg p-4 border border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center space-x-2">
                    <Icon name="AlertCircle" size={16} className="text-warning" />
                    <span>Constraints</span>
                  </h4>
                  
                  <ul className="space-y-2">
                    {challenge.constraints.map((constraint, index) => (
                      <li key={index} className="text-sm text-foreground flex items-start space-x-2">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>{constraint}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-surface rounded-lg p-4 border border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center space-x-2">
                    <Icon name="Clock" size={16} className="text-primary" />
                    <span>Time & Space Complexity</span>
                  </h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Expected Time:</span>
                      <code className="text-sm font-mono text-foreground">
                        {challenge.expectedComplexity.time}
                      </code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Expected Space:</span>
                      <code className="text-sm font-mono text-foreground">
                        {challenge.expectedComplexity.space}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isVisible && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default ChallengePanel;