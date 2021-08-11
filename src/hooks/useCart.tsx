import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const some = cart.some(({ id }) => {
        if (id === productId) {
          return true;
        }
        return false;
      });
      const hasStock = await api
        .get(`/stock/${productId}`)
        .then((response) => response.data);

      if (!some) {
        let product = await api
          .get(`/products/${productId}`)
          .then((response) => response.data);

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, { ...product, amount: 1 }])
        );

        setCart([...cart, { ...product, amount: 1 }]);
      }
      if (some) {
        const productHasNoStock = cart.some(
          (product) => !(product.amount + 1 <= hasStock.amount)
        );
        if (productHasNoStock) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
        const newCart = cart.map((product) => {
          if (product.id === productId) {
            if (product.amount + 1 <= hasStock.amount) {
              return {
                ...product,
                amount: product.amount + 1,
              };
            } else {
              toast.error("Quantidade solicitada fora de estoque");
              return product;
            }
          } else {
            return product;
          }
        });

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        setCart([...newCart]);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(
        (product) => product.id === productId
      );
      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (!amount || amount <= 0) {
        return;
      }

      const hasStock = await api
        .get(`/stock/${productId}`)
        .then((response) => response.data);

      if (amount > hasStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = cart.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            amount,
          };
        }
        return product;
      });
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

      setCart(newCart);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
