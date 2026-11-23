import { Request, Response, NextFunction } from 'express';
import {
  createSnack,
  consumeSnack,
  checkoutSnacks,
  getSnackById,
  getSnackOfTheWeek,
  listSnacks,
  restockSnack,
  softDeleteSnack,
  updateSnack,
  voteForSnack,
} from './snacks.service.js';

function getParamId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export async function listSnacksHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listSnacks(req.query as any, req.user?.id);
    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSnackHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const snack = await getSnackById(getParamId(req));
    res.status(200).json({
      success: true,
      data: snack,
    });
  } catch (error) {
    next(error);
  }
}

export async function createSnackHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const snack = await createSnack(req.body, req.user!.id);
    res.status(201).json({
      success: true,
      data: snack,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSnackHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const snack = await updateSnack(getParamId(req), req.body);
    res.status(200).json({
      success: true,
      data: snack,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteSnackHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const snack = await softDeleteSnack(getParamId(req));
    res.status(200).json({
      success: true,
      message: 'Snack archived successfully',
      data: snack,
    });
  } catch (error) {
    next(error);
  }
}

export async function restockHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await restockSnack(getParamId(req), req.body.amount, req.user!.id);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function consumeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await consumeSnack(getParamId(req), req.body.amount, req.user!.id);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function checkoutHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const results = await checkoutSnacks(req.body.items, req.user!.id);
    res.status(200).json({
      success: true,
      message: `Successfully checked out ${results.length} item${results.length === 1 ? '' : 's'}`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

export async function voteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vote = await voteForSnack(getParamId(req), req.user!.id);
    res.status(201).json({
      success: true,
      message: 'Vote recorded successfully',
      data: vote,
    });
  } catch (error) {
    next(error);
  }
}

export async function snackOfTheWeekHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getSnackOfTheWeek();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
