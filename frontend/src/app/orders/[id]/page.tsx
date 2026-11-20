import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { OrderDetail } from "./OrderDetail";

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrderDetail />
    </Suspense>
  );
}
