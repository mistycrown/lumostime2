import { describe, it, expect } from 'vitest';
import { parseFilterExpression } from './filterUtils';

describe('筛选器 OR 逻辑测试', () => {
    it('应该正确解析 #标签 OR 逻辑', () => {
        const result = parseFilterExpression("#运动 OR 学习");
        expect(result).toEqual({
            tags: [["运动", "学习"]],
            scopes: [],
            todos: [],
            notes: []
        });
    });

    it('应该正确解析混合条件的 OR 逻辑', () => {
        const result = parseFilterExpression("%健康 瑜伽 OR 冥想");
        expect(result).toEqual({
            tags: [],
            scopes: [["健康"]],
            todos: [],
            notes: [["瑜伽", "冥想"]]
        });
    });

    it('应该正确解析多个条件组的 OR 逻辑', () => {
        const result = parseFilterExpression("#工作 OR 学习 %健康");
        expect(result).toEqual({
            tags: [["工作", "学习"]],
            scopes: [["健康"]],
            todos: [],
            notes: []
        });
    });

    it('应该正确解析前缀继承的 OR 逻辑', () => {
        const result = parseFilterExpression("#工作 OR 学习");
        expect(result).toEqual({
            tags: [["工作", "学习"]],
            scopes: [],
            todos: [],
            notes: []
        });
    });

    it('应该正确解析 @代办 OR 逻辑', () => {
        const result = parseFilterExpression("@任务1 OR 任务2");
        expect(result).toEqual({
            tags: [],
            scopes: [],
            todos: [["任务1", "任务2"]],
            notes: []
        });
    });

    it('应该正确解析复杂的混合 OR 逻辑', () => {
        const result = parseFilterExpression("#运动 OR 学习 %健康 @任务1 OR 任务2 备注1 OR 备注2");
        expect(result).toEqual({
            tags: [["运动", "学习"]],
            scopes: [["健康"]],
            todos: [["任务1", "任务2"]],
            notes: [["备注1", "备注2"]]
        });
    });

    it('应该忽略大小写的 OR 关键字', () => {
        const result1 = parseFilterExpression("#运动 or 学习");
        const result2 = parseFilterExpression("#运动 Or 学习");
        const result3 = parseFilterExpression("#运动 oR 学习");
        
        const expected = {
            tags: [["运动", "学习"]],
            scopes: [],
            todos: [],
            notes: []
        };

        expect(result1).toEqual(expected);
        expect(result2).toEqual(expected);
        expect(result3).toEqual(expected);
    });
});