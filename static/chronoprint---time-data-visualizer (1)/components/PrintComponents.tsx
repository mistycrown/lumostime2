import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CategoryItem, SectionData } from '../types';
import { ColorTheme, getThemePaletteColor, THEMES } from '../utils';

export type PrintStyle = 'classic' | 'modern' | 'retro' | 'ticket';

// --- Helper Components ---

// Simulated Barcode for Ticket Style
const Barcode: React.FC<{ color: string }> = ({ color }) => {
  // Generate random widths for bars to look like a real barcode
  const bars = Array.from({ length: 40 }).map((_, i) => ({
    width: Math.random() > 0.7 ? 3 : 1,
    space: Math.random() > 0.5 ? 2 : 1,
    height: Math.random() > 0.8 ? 24 : 32
  }));

  return (
    <div className="flex items-end justify-center h-8 gap-[1px] opacity-80 mt-2">
      {bars.map((bar, i) => (
        <div 
          key={i} 
          style={{ 
            width: bar.width, 
            height: '100%', 
            backgroundColor: color,
            marginRight: bar.space 
          }} 
        />
      ))}
    </div>
  );
};

// Serrated Edge for Ticket Bottom (SVG Pattern)
const SerratedEdge: React.FC<{ bg: string }> = ({ bg }) => (
  <div 
    className="w-full h-2 relative z-20"
    style={{
        backgroundColor: 'transparent',
        // Triangle pattern using SVG data URI for reliability in export
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='6' viewBox='0 0 12 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h12L6 6z' fill='${encodeURIComponent(bg)}'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'top left',
        backgroundSize: '12px 6px',
        marginTop: '-1px' // Slight overlap to prevent sub-pixel gaps
    }}
  />
);

// --- Visualizations ---

interface SimpleBarChartProps {
  items: CategoryItem[];
  variantStyle?: PrintStyle;
  theme?: ColorTheme;
}

export const PrintBarChart: React.FC<SimpleBarChartProps> = ({ 
  items, 
  variantStyle = 'classic',
  theme = THEMES.ink 
}) => {
  const maxMinutes = Math.max(...items.map(i => i.minutes));

  return (
    <div className={`space-y-6 ${variantStyle === 'retro' ? 'font-sans' : ''}`}>
      {items.map((item, idx) => (
        <div key={idx} className="group">
          {/* Header Row */}
          <div className="flex flex-wrap items-end justify-between mb-1 gap-1 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <span 
                className={`
                  truncate
                  ${variantStyle === 'classic' ? 'font-serif font-bold text-lg' : ''}
                  ${variantStyle === 'modern' ? 'font-sans font-bold text-lg tracking-tight' : ''}
                  ${variantStyle === 'retro' ? 'font-display font-black text-xl tracking-tight' : ''}
                  ${variantStyle === 'ticket' ? 'font-serif font-bold text-lg tracking-tight' : ''}
                `}
                style={{ color: theme.primary }}
              >
                 {item.name}
              </span>
              <span 
                className={`
                  px-1.5 py-0.5
                  ${variantStyle === 'classic' ? 'text-[10px] font-mono font-medium rounded bg-gray-50' : ''}
                  ${variantStyle === 'modern' ? 'text-xs font-bold text-white' : ''}
                  ${variantStyle === 'retro' ? 'text-xs font-bold rounded-full border-2' : ''}
                  ${variantStyle === 'ticket' ? 'text-xs font-serif font-bold' : ''}
                `}
                style={{
                  color: variantStyle === 'classic' ? theme.secondary : (variantStyle === 'modern' ? '#fff' : theme.primary),
                  backgroundColor: variantStyle === 'modern' ? theme.primary : (variantStyle === 'retro' ? 'transparent' : undefined),
                  borderColor: variantStyle === 'retro' ? theme.primary : undefined,
                  opacity: variantStyle === 'ticket' ? 0.7 : 1
                }}
              >
                {item.percentageStr}
              </span>
            </div>
            <span 
              className={`
                whitespace-nowrap
                ${variantStyle === 'classic' ? 'font-sans text-sm font-medium' : ''}
                ${variantStyle === 'modern' ? 'font-sans text-sm font-bold' : ''}
                ${variantStyle === 'retro' ? 'font-mono text-sm font-bold' : ''}
                ${variantStyle === 'ticket' ? 'font-serif text-sm font-bold tracking-tight' : ''}
              `}
              style={{ color: variantStyle === 'modern' ? theme.primary : theme.secondary }}
            >
              {item.durationStr}
            </span>
          </div>

          {/* Bar Visual */}
          <div className={`
            w-full relative overflow-hidden mb-3
            ${variantStyle === 'classic' ? 'h-3 rounded-sm' : ''} 
            ${variantStyle === 'modern' ? 'h-5' : ''}
            ${variantStyle === 'retro' ? 'h-4 rounded-full' : ''} 
            ${variantStyle === 'ticket' ? 'h-[3px] mt-1' : ''} 
          `}
          style={{ 
             backgroundColor: variantStyle === 'modern' ? `${theme.primary}15` : 'transparent',
          }}
          >
             {/* Ticket Style Track (Dotted) */}
             {variantStyle === 'ticket' && (
                <div 
                  className="absolute inset-0 w-full border-b border-dotted" 
                  style={{ borderColor: `${theme.primary}30` }}
                ></div>
             )}

             <div 
               className={`
                 h-full absolute top-0 left-0
                 ${variantStyle === 'classic' ? 'opacity-90' : ''}
                 ${variantStyle === 'modern' ? '' : ''}
                 ${variantStyle === 'retro' ? 'rounded-full' : ''}
               `}
               style={{ 
                 width: `${(item.minutes / maxMinutes) * 100}%`,
                 backgroundColor: theme.primary 
               }}
             >
                {/* Pattern overlay for Classic - finer hatch */}
                {variantStyle === 'classic' && (
                  <div 
                    className="w-full h-full opacity-20"
                    style={{ 
                      backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 3px)',
                      backgroundSize: '4px 4px'
                    }}
                  ></div>
                )}
             </div>
          </div>

          {/* Sub Items (Grid layout) */}
          {item.subItems.length > 0 && (
            <div className={`
              ${variantStyle === 'classic' ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pl-3 border-l ml-0.5' : ''}
              ${variantStyle === 'modern' ? 'flex flex-wrap gap-x-3 gap-y-1' : ''}
              ${variantStyle === 'retro' ? 'flex flex-col gap-1 pl-0 ml-1' : ''}
              ${variantStyle === 'ticket' ? 'flex flex-col gap-1 pl-2 ml-0' : ''}
            `}
            style={{ borderColor: variantStyle === 'classic' ? `${theme.secondary}40` : undefined }}
            >
              {item.subItems.map((sub, sIdx) => (
                <div key={sIdx} className={`
                  flex items-baseline
                  ${variantStyle === 'classic' ? 'justify-between text-xs py-0.5 border-b border-dashed border-gray-100 last:border-0' : ''}
                  ${variantStyle === 'modern' ? 'text-[10px] font-sans font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-sm' : ''}
                  ${variantStyle === 'retro' ? 'justify-between text-xs font-medium border-b border-dotted pb-1' : ''}
                  ${variantStyle === 'ticket' ? 'justify-between text-xs font-serif border-b border-dotted pb-1 last:border-0' : ''}
                `}
                style={{ 
                  color: variantStyle === 'classic' ? theme.secondary : undefined,
                  borderColor: variantStyle === 'retro' || variantStyle === 'ticket' ? `${theme.primary}30` : undefined
                }}
                >
                  <span className={`
                    truncate
                    ${variantStyle === 'classic' ? 'font-serif italic pr-2' : ''}
                    ${variantStyle === 'retro' ? 'font-sans opacity-80' : ''}
                    ${variantStyle === 'ticket' ? 'font-serif opacity-80' : ''}
                  `}>
                    {sub.name}
                    {variantStyle === 'modern' && <span className="mx-1 text-gray-300">|</span>}
                  </span>
                  <span className={`
                    whitespace-nowrap
                    ${variantStyle === 'classic' ? 'font-mono' : ''}
                    ${variantStyle === 'modern' ? 'font-bold text-gray-900' : ''}
                    ${variantStyle === 'retro' ? 'font-mono opacity-60' : ''}
                    ${variantStyle === 'ticket' ? 'font-serif font-bold' : ''}
                  `}>{sub.durationStr}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface PrintDonutChartProps {
  data: SectionData;
  isMobile?: boolean;
  showDetails?: boolean;
  variant?: 'simple' | 'progress'; // 'simple' for Todo, 'progress' for Domains
  variantStyle?: PrintStyle;
  theme?: ColorTheme;
}

export const PrintDonutChart: React.FC<PrintDonutChartProps> = ({ 
  data, 
  isMobile, 
  showDetails, 
  variant = 'simple', 
  variantStyle = 'classic',
  theme = THEMES.ink
}) => {
  // Find the maximum value to scale the progress bars relative to the largest item
  const maxMinutes = Math.max(...data.items.map(i => i.minutes));

  const chartData = data.items.map((item, index) => ({
    name: item.name,
    value: item.minutes,
    displayTime: item.durationStr,
    // Use the theme palette for classic/modern
    color: variantStyle === 'modern' ? theme.primary : getThemePaletteColor(theme, index),
    originalItem: item,
    percent: (item.minutes / data.totalMinutes) * 100,
    relativeWidth: maxMinutes > 0 ? (item.minutes / maxMinutes) * 100 : 0
  }));

  return (
    <div className={`flex ${isMobile ? 'flex-col gap-8' : 'flex-col md:flex-row gap-8'} ${isMobile ? 'items-stretch' : 'items-start'}`}>
      
      {/* Chart Section */}
      <div className={`relative flex-shrink-0 ${isMobile ? 'w-48 h-48 mx-auto' : 'w-48 h-48'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={variantStyle === 'modern' ? 50 : 50}
              outerRadius={variantStyle === 'modern' ? 80 : 80}
              paddingAngle={variantStyle === 'retro' ? 0 : (variantStyle === 'ticket' ? 3 : 2)}
              dataKey="value"
              stroke={variantStyle === 'retro' ? theme.bg : (variantStyle === 'ticket' ? theme.bg : 'none')}
              strokeWidth={variantStyle === 'retro' ? 4 : (variantStyle === 'ticket' ? 2 : 0)}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={variantStyle === 'ticket' ? theme.primary : entry.color} 
                  opacity={variantStyle === 'modern' ? 1 - (index * 0.1) : (variantStyle === 'ticket' ? 1 - (index * 0.15) : 1)}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <span 
              className={`block text-2xl font-bold 
                ${variantStyle === 'classic' ? 'font-serif' : ''}
                ${variantStyle === 'modern' ? 'font-sans text-4xl' : ''}
                ${variantStyle === 'retro' ? 'font-display' : ''}
                ${variantStyle === 'ticket' ? 'font-serif' : ''}
              `}
              style={{ color: theme.primary }}
            >
              {data.items.length}
            </span>
            <span 
              className={`block text-[0.6rem] uppercase tracking-wider 
                ${variantStyle === 'retro' ? 'font-mono' : ''}
                ${variantStyle === 'ticket' ? 'font-serif' : ''}
              `}
              style={{ color: theme.secondary }}
            >
              Items
            </span>
          </div>
        </div>
      </div>

      {/* Legend / List Section */}
      <div className="flex-1 w-full">
        <div className={`flex flex-col ${variant === 'progress' ? 'gap-5' : 'gap-3'}`}>
          {chartData.map((entry, index) => (
            <div key={index} className="flex flex-col">
              
              {/* Variant: Progress Bar Style (For Domain/Scopes) */}
              {variant === 'progress' && (
                <div className="w-full">
                   <div className="flex justify-between items-end mb-1">
                      <div className="flex items-center gap-2">
                         <span 
                           className={`
                             text-sm
                             ${variantStyle === 'classic' ? 'font-serif font-bold' : ''}
                             ${variantStyle === 'modern' ? 'font-sans font-bold uppercase tracking-tight' : ''}
                             ${variantStyle === 'retro' ? 'font-display font-bold text-base' : ''}
                             ${variantStyle === 'ticket' ? 'font-serif font-bold text-base' : ''}
                           `}
                           style={{ color: theme.primary }}
                         >{entry.name}</span>
                         <span 
                           className={`text-[10px] ${variantStyle === 'retro' || variantStyle === 'ticket' ? 'font-serif' : ''}`}
                           style={{ color: theme.secondary }}
                         >({entry.percent.toFixed(1)}%)</span>
                      </div>
                      <span 
                        className={`
                          text-xs
                          ${variantStyle === 'classic' ? 'font-mono font-medium' : ''}
                          ${variantStyle === 'modern' ? 'font-sans font-bold' : ''}
                          ${variantStyle === 'retro' ? 'font-mono font-bold' : ''}
                          ${variantStyle === 'ticket' ? 'font-serif font-bold' : ''}
                        `}
                        style={{ color: theme.secondary }}
                      >{entry.displayTime}</span>
                   </div>
                   <div className={`
                     w-full overflow-hidden relative
                     ${variantStyle === 'classic' ? 'h-1.5 rounded-full' : ''}
                     ${variantStyle === 'modern' ? 'h-3' : ''}
                     ${variantStyle === 'retro' ? 'h-4 rounded-full' : ''}
                     ${variantStyle === 'ticket' ? 'h-[3px] mt-1' : ''}
                   `}
                   style={{ 
                     backgroundColor: variantStyle === 'modern' ? `${theme.primary}20` : undefined,
                   }}
                   >
                      {/* Ticket Style Track */}
                      {variantStyle === 'ticket' && (
                        <div 
                          className="absolute inset-0 w-full border-b border-dotted" 
                          style={{ borderColor: `${theme.primary}40` }}
                        ></div>
                      )}

                      <div 
                        className={`h-full absolute top-0 left-0 ${variantStyle === 'classic' || variantStyle === 'retro' ? 'rounded-full' : ''}`}
                        style={{ 
                          width: `${entry.relativeWidth}%`, 
                          backgroundColor: variantStyle === 'modern' ? theme.primary : (variantStyle === 'ticket' ? theme.primary : entry.color),
                          opacity: variantStyle === 'modern' ? 1 : 1 
                        }}
                      ></div>
                   </div>
                </div>
              )}

              {/* Variant: Simple List Style (For Todos) */}
              {variant === 'simple' && (
                <>
                  <div className={`
                    flex items-center justify-between pb-1.5 min-h-[2rem]
                    ${variantStyle === 'classic' ? 'border-b border-gray-100 last:border-0' : ''}
                    ${variantStyle === 'modern' ? 'border-b-2 last:border-0 py-2' : ''}
                    ${variantStyle === 'retro' ? 'border-b border-dotted last:border-0 pb-2' : ''}
                    ${variantStyle === 'ticket' ? 'border-b border-dotted last:border-0 pb-2' : ''}
                  `}
                  style={{ borderColor: variantStyle === 'modern' ? theme.primary : (variantStyle === 'retro' || variantStyle === 'ticket' ? `${theme.primary}60` : undefined) }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`
                        flex-shrink-0
                        ${variantStyle === 'classic' ? 'w-3 h-3 rounded-full' : 'w-2 h-2 rounded-none'}
                        ${variantStyle === 'retro' ? 'w-3 h-3 rounded-full border border-black/20' : ''}
                        ${variantStyle === 'ticket' ? 'w-3 h-3 border border-black/50' : ''}
                      `} style={{ backgroundColor: variantStyle === 'modern' ? theme.primary : (variantStyle === 'ticket' ? theme.primary : entry.color) }}></div>
                      
                      <span 
                        className={`
                          text-sm
                          ${variantStyle === 'classic' ? 'font-serif font-bold' : ''}
                          ${variantStyle === 'modern' ? 'font-sans font-extrabold text-lg' : ''}
                          ${variantStyle === 'retro' ? 'font-display font-bold text-base' : ''}
                          ${variantStyle === 'ticket' ? 'font-serif font-bold text-base tracking-tight' : ''}
                        `}
                        style={{ color: theme.primary }}
                      >{entry.name}</span>
                      
                      <span className={`
                        text-[10px] font-mono
                        ${variantStyle === 'modern' ? 'px-1 font-bold' : ''}
                        ${variantStyle === 'ticket' ? 'font-serif font-bold opacity-60' : ''}
                      `}
                      style={{ 
                        color: variantStyle === 'modern' ? theme.bg : theme.secondary,
                        backgroundColor: variantStyle === 'modern' ? theme.primary : undefined 
                      }}
                      >
                         {entry.percent.toFixed(1)}%
                      </span>
                    </div>
                    <span 
                      className={`
                        whitespace-nowrap
                        ${variantStyle === 'classic' ? 'font-mono text-xs' : ''}
                        ${variantStyle === 'modern' ? 'font-sans text-sm font-bold' : ''}
                        ${variantStyle === 'retro' ? 'font-mono text-xs' : ''}
                        ${variantStyle === 'ticket' ? 'font-serif text-xs font-bold' : ''}
                      `}
                      style={{ color: theme.secondary }}
                    >{entry.displayTime}</span>
                  </div>
                  
                  {/* Inline Sub-items Detail View */}
                  {showDetails && entry.originalItem.subItems.length > 0 && (
                    <div className={`
                      mt-2 mb-3 pl-5
                      ${variantStyle === 'retro' || variantStyle === 'ticket' ? 'border-l border-dotted' : ''}
                    `}
                    style={{ borderColor: variantStyle === 'retro' || variantStyle === 'ticket' ? `${theme.primary}40` : undefined }}
                    >
                      <ul className={`
                        space-y-2 
                        ${variantStyle === 'classic' ? 'border-l border-neutral-200 pl-3' : ''}
                        ${variantStyle === 'modern' ? 'pl-0' : ''}
                      `}>
                        {entry.originalItem.subItems.map((sub, sIdx) => (
                          <li key={sIdx} className="text-xs font-sans leading-relaxed flex justify-between items-baseline gap-2" style={{ color: theme.secondary }}>
                            <span className={`flex-1 ${variantStyle === 'retro' ? 'font-sans font-medium' : ''} ${variantStyle === 'ticket' ? 'font-serif font-medium' : ''}`}>{sub.name}</span>
                            <span className={`whitespace-nowrap text-[10px] opacity-70 ${variantStyle === 'retro' ? 'font-mono' : 'font-serif'}`}>{sub.durationStr}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface PrintCardProps {
  title: string;
  total: string;
  children: React.ReactNode;
  categoryLabel: string; // e.g., TAGS, TODOS, SCOPES
  subtitle: string; // e.g., Tag Statistics
  isWide?: boolean;
  isMobile?: boolean;
  variantStyle?: PrintStyle;
  theme?: ColorTheme;
}

// Converted to forwardRef to allow capturing by html-to-image
export const PrintCard = React.forwardRef<HTMLDivElement, PrintCardProps>(({ 
  title, 
  total, 
  children, 
  categoryLabel, 
  subtitle,
  isWide, 
  isMobile,
  variantStyle = 'classic',
  theme = THEMES.ink
}, ref) => {
  
  // Style configurations
  const containerClasses = {
    classic: "bg-white shadow-lg print:shadow-none print:border print:border-gray-200",
    modern: "bg-white border-y-8 relative", // Added relative to constrain absolute children (dot grid)
    retro: "shadow-none relative overflow-hidden", 
    ticket: "shadow-md relative mb-8", // mb-8 for visual spacing in app, but export needs careful handling
  };

  const headerBorder = {
    classic: "border-b-4 pb-4",
    modern: "border-b-2 pb-6",
    retro: "border-b-2 border-black/10 pb-4",
    ticket: "border-b-2 border-dotted pb-4"
  };

  return (
    <div 
      ref={ref} 
      className={`flex flex-col ${isWide ? 'col-span-2' : 'col-span-1'} ${containerClasses[variantStyle]}`}
      style={{
        // For ticket, the main container is transparent to allow the serrated edge bottom to work with the page background.
        // We add an inner container for the background color.
        backgroundColor: variantStyle === 'ticket' ? 'transparent' : (variantStyle === 'retro' ? theme.bg : '#ffffff'),
        borderColor: variantStyle === 'modern' ? theme.primary : undefined,
        borderRadius: variantStyle === 'retro' ? '1.5rem' : '0',
        padding: variantStyle === 'ticket' ? '0' : (isMobile ? '1.5rem' : '2rem 3rem')
      }}
    >
      {/* 
        Ticket Structure:
        1. Inner Container with BG (Content)
        2. Static Edge below
      */}
      {variantStyle === 'ticket' ? (
        <>
           <div className="p-6 md:p-8" style={{ backgroundColor: theme.bg }}>
              <CardContent 
                title={title} 
                subtitle={subtitle} 
                total={total} 
                categoryLabel={categoryLabel} 
                headerBorder={headerBorder[variantStyle]} 
                theme={theme} 
                isMobile={isMobile} 
                variantStyle={variantStyle}
              >
                 {/* Top Perforation for Ticket */}
                 <div className="absolute top-0 left-0 w-full h-3 border-b border-gray-300 opacity-20 pointer-events-none"></div>
                 {children}
              </CardContent>
           </div>
           {/* Static Serrated Edge */}
           <SerratedEdge bg={theme.bg} />
        </>
      ) : (
        /* Other Styles Structure */
        <>
            {/* Modern Grid Background */}
            {variantStyle === 'modern' && (
                <div 
                className="absolute inset-0 pointer-events-none opacity-[0.08]" 
                style={{ 
                backgroundImage: `radial-gradient(${theme.primary} 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
                }}
            ></div>
            )}

            {/* Retro Grain Overlay */}
            {variantStyle === 'retro' && (
                <div 
                className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply"
                style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
                }}
                ></div>
            )}
            
            <CardContent 
                title={title} 
                subtitle={subtitle} 
                total={total} 
                categoryLabel={categoryLabel} 
                headerBorder={headerBorder[variantStyle]} 
                theme={theme} 
                isMobile={isMobile} 
                variantStyle={variantStyle}
            >
                {children}
            </CardContent>
        </>
      )}
    </div>
  );
});

// Extracted inner content to avoid duplication
const CardContent: React.FC<{
    title: string;
    subtitle: string;
    total: string;
    categoryLabel: string;
    headerBorder: string;
    theme: ColorTheme;
    isMobile?: boolean;
    variantStyle: PrintStyle;
    children: React.ReactNode;
}> = ({ title, subtitle, total, categoryLabel, headerBorder, theme, isMobile, variantStyle, children }) => {
    return (
        <>
            {/* Header Container */}
            <header 
                className={`flex justify-between mb-6 gap-4 relative z-10 ${headerBorder}`}
                style={{ borderColor: variantStyle === 'classic' || variantStyle === 'modern' ? theme.primary : (variantStyle === 'ticket' ? `${theme.primary}60` : undefined) }}
            >
                {/* Left Block */}
                <div className="flex flex-col justify-between items-start gap-1">
                <h1 
                    className={`
                    leading-[0.9]
                    ${isMobile ? 'text-2xl' : 'text-3xl md:text-4xl'}
                    ${variantStyle === 'classic' ? 'font-display font-bold' : ''}
                    ${variantStyle === 'modern' ? 'font-sans font-black tracking-tighter uppercase' : ''}
                    ${variantStyle === 'retro' ? 'font-display font-black tracking-tight' : ''}
                    ${variantStyle === 'ticket' ? 'font-serif font-bold tracking-tight uppercase' : ''}
                    `}
                    style={{ color: theme.primary }}
                >
                    {title}
                </h1>
                <p 
                    className={`
                    text-sm leading-none mt-1
                    ${variantStyle === 'classic' ? 'font-sans font-medium tracking-widest' : ''}
                    ${variantStyle === 'modern' ? 'font-sans font-bold tracking-normal uppercase inline-block px-1' : ''}
                    ${variantStyle === 'retro' ? 'font-mono font-medium opacity-70 tracking-tight' : ''}
                    ${variantStyle === 'ticket' ? 'font-serif font-medium opacity-80 uppercase tracking-widest' : ''}
                    `}
                    style={{ 
                    color: variantStyle === 'modern' ? theme.bg : (variantStyle === 'ticket' ? theme.accent : theme.secondary),
                    backgroundColor: variantStyle === 'modern' ? theme.accent : undefined
                    }}
                >
                    {subtitle}
                </p>
                </div>

                {/* Right Block */}
                <div className="flex flex-col justify-between items-end text-right flex-shrink-0">
                <div 
                    className={`
                    text-[10px] leading-none pt-1
                    ${variantStyle === 'classic' ? 'font-sans uppercase tracking-widest' : ''}
                    ${variantStyle === 'modern' ? 'font-sans font-bold uppercase' : ''}
                    ${variantStyle === 'retro' ? 'font-mono uppercase opacity-60' : ''}
                    ${variantStyle === 'ticket' ? 'font-serif uppercase opacity-80 font-bold' : ''}
                    `}
                    style={{ color: variantStyle === 'modern' ? theme.primary : theme.secondary }}
                >Total Time</div>
                <div 
                    className={`
                    leading-[0.85]
                    ${isMobile ? 'text-xl' : 'text-2xl'}
                    ${variantStyle === 'classic' ? 'font-serif font-bold' : ''}
                    ${variantStyle === 'modern' ? 'font-sans font-black' : ''}
                    ${variantStyle === 'retro' ? 'font-display font-black' : ''}
                    ${variantStyle === 'ticket' ? 'font-serif font-bold' : ''}
                    `}
                    style={{ color: theme.primary }}
                >{total}</div>
                </div>

            </header>

            <div className="flex-1 relative z-10">
                {children}
            </div>

            <footer className={`
                mt-10 pt-4 flex justify-between items-center text-[10px] uppercase tracking-widest relative z-10
                ${variantStyle === 'classic' ? 'border-t border-gray-100 font-sans' : ''}
                ${variantStyle === 'modern' ? 'border-t-4 font-sans font-bold' : ''}
                ${variantStyle === 'retro' ? 'border-t-2 border-black/5 font-mono opacity-60' : ''}
                ${variantStyle === 'ticket' ? 'flex-col border-t border-dotted' : ''}
            `}
            style={{ 
                color: variantStyle === 'classic' ? theme.secondary : (variantStyle === 'modern' ? theme.primary : theme.primary),
                borderColor: variantStyle === 'modern' ? theme.primary : (variantStyle === 'ticket' ? `${theme.primary}60` : undefined)
            }}
            >
                {variantStyle === 'ticket' ? (
                <div className="w-full flex flex-col items-center py-2 gap-2">
                    <div className="flex justify-between w-full">
                    <span className="font-serif font-bold">LUMOSTIME</span>
                    <span className="font-serif opacity-70">{categoryLabel}</span>
                    </div>
                    <Barcode color={theme.primary} />
                    <div className="text-[8px] font-mono opacity-50 tracking-widest">THANK YOU</div>
                </div>
                ) : (
                <>
                    <span className={`${variantStyle === 'classic' ? 'font-bold opacity-70' : ''}`}>LUMOSTIME</span>
                    <span>{categoryLabel}</span>
                </>
                )}
            </footer>
        </>
    );
};

PrintCard.displayName = "PrintCard";