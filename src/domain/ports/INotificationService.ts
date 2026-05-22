export interface INotificationService {
  sendLowStockAlert(
    productId: string,
    productName: string,
    currentStock: number,
    threshold: number,
  ): Promise<void>;
}
