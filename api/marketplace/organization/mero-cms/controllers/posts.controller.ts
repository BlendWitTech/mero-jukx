import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { PostsService } from '../services/posts.service';
import { CreatePostDto, UpdatePostDto } from '../dto/post.dto';
import { JwtAuthGuard } from '../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../src/common/decorators/permissions.decorator';
import { AppSlug } from '../../../../src/common/decorators/app-slug.decorator';

@Controller('cms/posts')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-cms')
export class PostsController {
    constructor(private readonly postsService: PostsService) {}

    @Get()
    @Permissions('cms.posts.view')
    findAll(@Request() req, @Query('category') category?: string) {
        return this.postsService.findAll(req.user.organizationId, category);
    }

    @Get('stats')
    @Permissions('cms.posts.view')
    getStats(@Request() req) {
        return this.postsService.getStats(req.user.organizationId);
    }

    @Get('categories')
    @Permissions('cms.posts.view')
    getCategories(@Request() req) {
        return this.postsService.getCategories(req.user.organizationId);
    }

    @Get(':id')
    @Permissions('cms.posts.view')
    findOne(@Param('id') id: string, @Request() req) {
        return this.postsService.findOne(id, req.user.organizationId);
    }

    @Post()
    @Permissions('cms.posts.create')
    create(@Body() dto: CreatePostDto, @Request() req) {
        return this.postsService.create(dto, req.user.organizationId, req.user.userId);
    }

    @Patch(':id')
    @Permissions('cms.posts.edit')
    update(@Param('id') id: string, @Body() dto: UpdatePostDto, @Request() req) {
        return this.postsService.update(id, dto, req.user.organizationId);
    }

    @Post(':id/publish')
    @Permissions('cms.posts.edit')
    publish(@Param('id') id: string, @Request() req) {
        return this.postsService.publish(id, req.user.organizationId);
    }

    @Post(':id/unpublish')
    @Permissions('cms.posts.edit')
    unpublish(@Param('id') id: string, @Request() req) {
        return this.postsService.unpublish(id, req.user.organizationId);
    }

    @Delete(':id')
    @Permissions('cms.posts.delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.postsService.remove(id, req.user.organizationId);
    }
}
