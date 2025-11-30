import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createNoteDto: CreateNoteDto) {
    return this.prisma.note.create({
      data: {
        ...createNoteDto,
        userId,
      },
    });
  }

  async findAll(userId: string, search?: string) {
    return this.prisma.note.findMany({
      where: {
        userId,
        OR: search
          ? [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
    });

    if (!note || note.userId !== userId) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async update(userId: string, id: string, updateNoteDto: UpdateNoteDto) {
    // Ensure note exists and belongs to user
    await this.findOne(userId, id);

    return this.prisma.note.update({
      where: { id },
      data: updateNoteDto,
    });
  }

  async remove(userId: string, id: string) {
    // Ensure note exists and belongs to user
    await this.findOne(userId, id);

    return this.prisma.note.delete({
      where: { id },
    });
  }
}

