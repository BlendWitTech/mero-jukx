import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Recruitment')
@Controller('hr/recruitment')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class RecruitmentController {
    constructor(private readonly service: RecruitmentService) { }

    // ─── Jobs ──────────────────────────────────────────────────────────────────

    @Get('jobs')
    @ApiOperation({ summary: 'List all job openings' })
    getJobs(@CurrentUser('organizationId') orgId: string) {
        return this.service.getJobs(orgId);
    }

    @Get('jobs/:id')
    @ApiOperation({ summary: 'Get a single job opening' })
    getJob(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
        return this.service.getJob(orgId, id);
    }

    @Post('jobs')
    @ApiOperation({ summary: 'Create a job opening' })
    createJob(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
        return this.service.createJob(orgId, body);
    }

    @Patch('jobs/:id')
    @ApiOperation({ summary: 'Update a job opening' })
    updateJob(@CurrentUser('organizationId') orgId: string, @Param('id') id: string, @Body() body: any) {
        return this.service.updateJob(orgId, id, body);
    }

    @Delete('jobs/:id')
    @ApiOperation({ summary: 'Delete a job opening' })
    deleteJob(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
        return this.service.deleteJob(orgId, id);
    }

    // ─── Candidates ─────────────────────────────────────────────────────────────

    @Get('candidates')
    @ApiOperation({ summary: 'List all candidates' })
    getCandidates(@CurrentUser('organizationId') orgId: string, @Query('jobId') jobId?: string) {
        return this.service.getCandidates(orgId, jobId);
    }

    @Get('candidates/:id')
    @ApiOperation({ summary: 'Get a single candidate' })
    getCandidate(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
        return this.service.getCandidate(orgId, id);
    }

    @Post('candidates')
    @ApiOperation({ summary: 'Add a candidate' })
    createCandidate(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
        return this.service.createCandidate(orgId, body);
    }

    @Patch('candidates/:id')
    @ApiOperation({ summary: 'Update candidate stage / details' })
    updateCandidate(@CurrentUser('organizationId') orgId: string, @Param('id') id: string, @Body() body: any) {
        return this.service.updateCandidate(orgId, id, body);
    }

    @Delete('candidates/:id')
    @ApiOperation({ summary: 'Delete a candidate' })
    deleteCandidate(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
        return this.service.deleteCandidate(orgId, id);
    }
}
