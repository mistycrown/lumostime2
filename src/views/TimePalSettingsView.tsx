/**
 * @file TimePalSettingsView.tsx
 * @description 时光小友设置页面
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Category } from '../types';

interface TimePalSettingsViewProps {
    onBack: () => void;
    categories: Category[];
    onToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

type TimePalType = 'cat' | 'dog' | 'rabbit';

const TIMEPAL_OPTIONS: { id: TimePalType; name: string; emoji: string }[] = [
    { id: 'cat', name: '猫咪', emoji: '🐱' },
    { id: 'dog', name: '小狗', emoji: '🐶' },
    { id: 'rabbit', name: '兔子', emoji: '🐰' },
];