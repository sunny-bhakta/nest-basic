import { Test, TestingModule } from '@nestjs/testing';
import { TasksModule } from './tasks.module';
import { TasksService } from './tasks.service';
import { ScheduleModule } from '@nestjs/schedule';

describe('TasksModule', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [TasksModule],
        }).compile();
    });

    it('should be defined', () => {
        const tasksModule = module.get<TasksModule>(TasksModule);
        expect(tasksModule).toBeDefined();
    });

    it('should provide TasksService', () => {
        const tasksService = module.get<TasksService>(TasksService);
        expect(tasksService).toBeInstanceOf(TasksService);
    });

    it('should import ScheduleModule', () => {
        const imports = (TasksModule as any).ɵmod.imports;
        expect(imports).toBeDefined();
        expect(imports.some((imp: any) => imp === ScheduleModule.forRoot())).toBeTruthy();
    });
});